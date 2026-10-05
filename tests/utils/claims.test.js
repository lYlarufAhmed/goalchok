import { describe, it, expect } from 'vitest'
import { canManageClaims, defaultClaims, PRIVILEGED_ROLE } from '../../functions/claims.js'

describe('claims trust boundary', () => {
  it('exports the privileged role constant', () => {
    expect(PRIVILEGED_ROLE).toBe('admin')
  })

  describe('canManageClaims', () => {
    it('allows callers holding the privileged role', () => {
      expect(canManageClaims({ orgId: 'org-a', role: 'admin' })).toBe(true)
    })

    it('rejects callers without any claims', () => {
      expect(canManageClaims(null)).toBe(false)
      expect(canManageClaims(undefined)).toBe(false)
    })

    it('rejects callers with only an org membership', () => {
      expect(canManageClaims({ orgId: 'org-a' })).toBe(false)
    })

    it('rejects callers holding a non-privileged role', () => {
      expect(canManageClaims({ orgId: 'org-a', role: 'viewer' })).toBe(false)
      expect(canManageClaims({ role: 'manager' })).toBe(false)
    })
  })

  describe('defaultClaims', () => {
    it('assigns org membership without any role', () => {
      const claims = defaultClaims()
      expect(claims.orgId).toBe('default-org')
      expect(claims.role).toBeUndefined()
    })
  })
})
