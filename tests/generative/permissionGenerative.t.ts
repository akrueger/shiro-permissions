import fc from 'fast-check'
import { PermissionFormatError } from '../../src/PermissionFormatError'
import { ShiroPermissionManager } from '../../src/ShiroPermissionManager'
import {
  hierarchicalPermissionArbitrary,
  invalidPermissionArbitrary,
  permissionPairArbitrary,
  permissionSetArbitrary,
  validPermissionArbitrary
} from './permissionGenerators'
import { isValidPermission } from './permissionProperties'

describe('ShiroPermissionManager Property Tests', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  describe('Permission Format Validation', () => {
    test('valid permissions should be accepted', () => {
      fc.assert(
        fc.property(validPermissionArbitrary, (permission) => {
          expect(() => manager.grantPermissions([permission])).not.toThrow()
          expect(isValidPermission(permission)).toBe(true)
        })
      )
    })

    test('invalid permissions should be rejected', () => {
      fc.assert(
        fc.property(invalidPermissionArbitrary, (permission) => {
          expect(() => manager.grantPermissions([permission])).toThrow(
            PermissionFormatError
          )
          expect(isValidPermission(permission)).toBe(false)
        })
      )
    })
  })

  describe('Permission Implications', () => {
    test('wildcard permissions should imply specific permissions', () => {
      fc.assert(
        fc.property(permissionPairArbitrary, ([specific, general]) => {
          manager.grantPermissions([general])
          const implies = manager.isPermitted(specific)
          // If general has wildcard, it should imply specific
          const shouldImply = general.includes('*')
          expect(implies).toBe(shouldImply)
        })
      )
    })

    test('specific permissions should not imply more general ones', () => {
      fc.assert(
        fc.property(permissionPairArbitrary, ([specific, general]) => {
          manager.grantPermissions([specific])
          if (specific !== general) {
            expect(manager.isPermitted(general)).toBe(false)
          }
        })
      )
    })
  })

  describe('Permission Set Operations', () => {
    test('permission checks should be idempotent', () => {
      fc.assert(
        fc.property(validPermissionArbitrary, (permission) => {
          manager.grantPermissions([permission])
          const firstCheck = manager.isPermitted(permission)
          const secondCheck = manager.isPermitted(permission)
          expect(firstCheck).toBe(secondCheck)
        })
      )
    })

    test('permission grants should be cumulative', () => {
      fc.assert(
        fc.property(permissionSetArbitrary, (permissions) => {
          const permArray = Array.from(permissions)
          permArray.forEach((perm) => {
            manager.grantPermissions([perm])
          })

          permissions.forEach((perm) => {
            expect(manager.isPermitted(perm)).toBe(true)
          })
        })
      )
    })
  })

  describe('Hierarchical Permissions', () => {
    test('permission hierarchy should be properly enforced', () => {
      fc.assert(
        fc.property(
          hierarchicalPermissionArbitrary,
          ({ full, domainAction, specific, unrelated }) => {
            // Test full wildcard permission
            manager.clear()
            manager.grantPermissions([full])
            expect(manager.isPermitted(domainAction)).toBe(true)
            expect(manager.isPermitted(specific)).toBe(true)
            expect(manager.isPermitted(unrelated)).toBe(false)

            // Test domain:action:* permission
            manager.clear()
            manager.grantPermissions([domainAction])
            expect(manager.isPermitted(specific)).toBe(true)
            expect(manager.isPermitted(unrelated)).toBe(false)

            // Test specific permission
            manager.clear()
            manager.grantPermissions([specific])
            expect(manager.isPermitted(domainAction)).toBe(false)
            expect(manager.isPermitted(full)).toBe(false)
            expect(manager.isPermitted(unrelated)).toBe(false)
          }
        )
      )
    })
  })

  describe('Cache Behavior', () => {
    test('cache should not affect permission check results', () => {
      fc.assert(
        fc.property(
          permissionSetArbitrary,
          validPermissionArbitrary,
          (permissions, checkPermission) => {
            const permArray = Array.from(permissions)

            // First check without cache
            manager.clear()
            manager.grantPermissions(permArray)
            const resultWithoutCache = manager.isPermitted(checkPermission)

            // Check multiple times to exercise cache
            const results = Array.from({ length: 10 }, () =>
              manager.isPermitted(checkPermission)
            )

            // All results should be consistent
            expect(results.every((r) => r === resultWithoutCache)).toBe(true)
          }
        )
      )
    })
  })

  describe('Edge Cases', () => {
    test('clear should reset all permissions', () => {
      fc.assert(
        fc.property(
          permissionSetArbitrary,
          validPermissionArbitrary,
          (permissions, checkPermission) => {
            const permArray = Array.from(permissions)
            manager.grantPermissions(permArray)

            // Clear and verify no permissions remain
            manager.clear()
            expect(manager.isPermitted(checkPermission)).toBe(false)
          }
        )
      )
    })

    test('permission checks should be case-insensitive by default', () => {
      fc.assert(
        fc.property(validPermissionArbitrary, (permission) => {
          const lowerPermission = permission.toLowerCase()
          manager.grantPermissions([lowerPermission])

          // Both the original permission and its variations should match
          const permissionsToCheck = [
            permission,
            permission.toLowerCase(),
            permission.toUpperCase()
          ]

          permissionsToCheck.forEach((p) => {
            expect(manager.isPermitted(p)).toBe(true)
          })
        })
      )
    })
  })
})
