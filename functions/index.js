import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { canManageClaims, defaultClaims, PRIVILEGED_ROLE } from './claims.js';

admin.initializeApp();

export const assignOrgId = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Only existing admins may modify custom claims — otherwise any registered
  // user could grant themselves the admin role and defeat the security rules.
  if (!canManageClaims(request.auth.token)) {
    throw new HttpsError('permission-denied', 'Only admins can manage org claims.');
  }

  const { targetUid, orgId, role } = request.data;
  const callerUid = request.auth.uid;

  const uidToUpdate = targetUid || callerUid;
  const claimsToSet = {};
  if (orgId) {
    if (typeof orgId !== 'string' || !orgId.trim()) {
      throw new HttpsError('invalid-argument', 'orgId must be a non-empty string.');
    }
    claimsToSet.orgId = orgId;
  }
  if (role) {
    if (role !== PRIVILEGED_ROLE) {
      throw new HttpsError('invalid-argument', `role must be "${PRIVILEGED_ROLE}" or omitted.`);
    }
    claimsToSet.role = role;
  }

  try {
    const userRecord = await getAuth().getUser(uidToUpdate);
    const currentClaims = userRecord.customClaims || {};

    // Merge new claims with existing ones
    const newClaims = {
      ...currentClaims,
      ...claimsToSet
    };

    await getAuth().setCustomUserClaims(uidToUpdate, newClaims);
    return { success: true, claims: newClaims };
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw new HttpsError('internal', 'Error setting custom claims.');
  }
});

// New sign-ups get org membership only — never a role claim. Admin accounts
// are provisioned deliberately: the first admin out-of-band (Firebase console
// or the auth emulator), subsequent ones by an admin via assignOrgId.
export const beforecreated = beforeUserCreated(() => {
  return {
    customClaims: defaultClaims()
  };
});
