import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { applyClaimChanges, canManageClaims, defaultClaims, PRIVILEGED_ROLE } from '../../functions/claims.js'

const sharedTenant = JSON.parse(readFileSync(new URL('../../shared/tenant.json', import.meta.url)))

describe('claims trust boundary', () => {
  it('keeps the default org claim in sync with shared/tenant.json', () => {
    expect(defaultClaims().orgId).toBe(sharedTenant.defaultOrg)
  })

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

describe('applyClaimChanges', () => {
  const current = { orgId: 'org-a', role: 'admin', other: 'kept' }

  it('keeps claims that are omitted', () => {
    expect(applyClaimChanges(current, {})).toEqual({ claims: current, removed: [] })
  })

  it('sets orgId and the privileged role', () => {
    const { claims, removed } = applyClaimChanges({}, { orgId: 'org-b', role: 'admin' })
    expect(claims).toEqual({ orgId: 'org-b', role: 'admin' })
    expect(removed).toEqual([])
  })

  it('revokes a claim passed as null and reports it', () => {
    const { claims, removed } = applyClaimChanges(current, { role: null })
    expect(claims).toEqual({ orgId: 'org-a', other: 'kept' })
    expect(removed).toEqual(['role'])
  })

  it('does not report revoking a claim the user never had', () => {
    expect(applyClaimChanges({ orgId: 'org-a' }, { role: null }).removed).toEqual([])
  })

  it('rejects non-privileged roles and empty org ids', () => {
    expect(() => applyClaimChanges({}, { role: 'viewer' })).toThrow(/role must be/)
    expect(() => applyClaimChanges({}, { orgId: '  ' })).toThrow(/orgId must be/)
    expect(() => applyClaimChanges({}, { orgId: 42 })).toThrow(/orgId must be/)
  })

  it('does not mutate the current claims', () => {
    const before = { ...current }
    applyClaimChanges(current, { role: null, orgId: 'org-z' })
    expect(current).toEqual(before)
  })
})
