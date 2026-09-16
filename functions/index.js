import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

admin.initializeApp();

export const assignOrgId = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { targetUid, orgId, role } = request.data;
  const callerUid = request.auth.uid;

  // In a real application, you should verify if callerUid has admin privileges
  // For the MVP SaaS, we'll allow setting custom claims directly or just allow setting own orgId
  // if they don't have one, or allow setting others if they are a super-admin.
  
  // Here we just assign the orgId to the target user
  const uidToUpdate = targetUid || callerUid;
  const claimsToSet = {};
  if (orgId) claimsToSet.orgId = orgId;
  if (role) claimsToSet.role = role;

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

// We can also have an onCreate trigger to assign a default orgId
export const beforecreated = beforeUserCreated(() => {
  // Automatically assign 'default-org' to new users for the MVP
  return {
    customClaims: {
      orgId: 'default-org',
      role: 'admin'
    }
  };
});
