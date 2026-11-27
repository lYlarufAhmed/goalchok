import { describe, it, expect, vi } from 'vitest'

// The store imports the Firebase app; only the pure helper is under test.
vi.mock('../../src/config/firebase', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

const { isAdminClaims, ADMIN_ROLE } = await import('../../src/stores/useAuthStore')
const { PRIVILEGED_ROLE } = await import('../../functions/claims.js')

describe('isAdminClaims (admin area gate)', () => {
  it('matches the functions-side privileged role', () => {
    expect(ADMIN_ROLE).toBe(PRIVILEGED_ROLE)
  })

  it('admits only the Admin Claim', () => {
    expect(isAdminClaims({ role: 'admin', orgId: 'org-a' })).toBe(true)
    expect(isAdminClaims({ orgId: 'org-a' })).toBe(false)
    expect(isAdminClaims({ role: 'viewer' })).toBe(false)
    expect(isAdminClaims(null)).toBe(false)
  })
})
