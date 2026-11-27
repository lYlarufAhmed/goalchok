import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { applyClaimChanges, canManageClaims, defaultClaims } from './claims.js';

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

  // For orgId and role: omit to keep, pass a value to set, pass null to revoke.
  const { targetUid, orgId, role } = request.data || {};
  const callerUid = request.auth.uid;
  const uidToUpdate = targetUid || callerUid;

  // An admin can't demote themselves — prevents locking every admin out.
  if (uidToUpdate === callerUid && role === null) {
    throw new HttpsError('failed-precondition', 'Admins cannot revoke their own admin role.');
  }

  let userRecord;
  try {
    userRecord = await getAuth().getUser(uidToUpdate);
  } catch (error) {
    console.error('Error loading user for claims update:', error);
    throw new HttpsError('not-found', 'User not found.');
  }

  let result;
  try {
    result = applyClaimChanges(userRecord.customClaims, { orgId, role });
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }

  try {
    await getAuth().setCustomUserClaims(uidToUpdate, result.claims);
    // A revoked claim stays in the user's current ID token until it expires;
    // revoking refresh tokens signs them out instead of waiting up to an hour.
    if (result.removed.length) {
      await getAuth().revokeRefreshTokens(uidToUpdate);
    }
    return { success: true, claims: result.claims, removed: result.removed };
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
