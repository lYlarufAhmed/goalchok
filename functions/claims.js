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

/**
 * Apply a claims change request to a user's current custom claims.
 *
 * For each of `orgId` and `role`: `undefined` keeps the current value,
 * `null` removes the claim, and a value sets it (validated).
 *
 * @param {Record<string, unknown>} current - the user's current custom claims
 * @param {{ orgId?: string | null, role?: string | null }} changes
 * @returns {{ claims: Record<string, unknown>, removed: string[] }}
 * @throws {Error} with `code = 'invalid-argument'` for invalid values
 */
export function applyClaimChanges(current, { orgId, role } = {}) {
  const invalid = (message) => Object.assign(new Error(message), { code: 'invalid-argument' })
  const claims = { ...(current || {}) }
  const removed = []

  if (orgId === null) {
    if ('orgId' in claims) removed.push('orgId')
    delete claims.orgId
  } else if (orgId !== undefined) {
    if (typeof orgId !== 'string' || !orgId.trim()) throw invalid('orgId must be a non-empty string or null.')
    claims.orgId = orgId
  }

  if (role === null) {
    if ('role' in claims) removed.push('role')
    delete claims.role
  } else if (role !== undefined) {
    if (role !== PRIVILEGED_ROLE) throw invalid(`role must be "${PRIVILEGED_ROLE}" or null.`)
    claims.role = role
  }

  return { claims, removed }
}
