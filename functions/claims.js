/**
 * The custom-claims trust boundary, kept as pure logic so it can be unit
 * tested without the functions emulator.
 *
 * Security model: the `role: 'admin'` claim is the only write-authorizing
 * claim. It must never be granted automatically at sign-up — it is set
 * deliberately by an existing admin via the assignOrgId callable (or
 * out-of-band for the first admin).
 */

export const PRIVILEGED_ROLE = 'admin'

/**
 * Whether the caller's claims authorize managing other users' claims.
 * @param {{ role?: string } | null | undefined} claims
 * @returns {boolean}
 */
export function canManageClaims(claims) {
  return claims?.role === PRIVILEGED_ROLE
}

/**
 * Claims assigned to every newly created user: org membership only,
 * never a privileged role.
 *
 * The literal mirrors shared/tenant.json (defaultOrg) — the functions
 * package cannot import files outside functions/ at deploy time, so the
 * equality is pinned by tests/utils/claims.test.js instead.
 */
export function defaultClaims() {
  return { orgId: 'default-org' }
}
