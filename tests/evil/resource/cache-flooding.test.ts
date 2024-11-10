import { ShiroPermissionManager } from '../../../src'

describe('Evil: Cache Flooding', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('cache flooding with unique permissions', () => {
    // Generate massive number of unique permissions
    const permissions = Array.from(
      { length: 100_000 },
      (_, i) => `resource${i}:view:1`
    )

    // Should handle this gracefully
    manager.grantPermissions(permissions)

    // Verify cache still works efficiently
    for (let i = 0; i < 1000; i++) {
      const randomIndex = Math.floor(Math.random() * permissions.length)
      expect(manager.isPermitted(permissions[randomIndex])).toBe(true)
      expect(manager.isPermitted('nonexistent:view:1')).toBe(false)
    }
  })

  test('cache flooding with permission checks', () => {
    manager.grantPermissions(['resource:*:*'])

    // Try to flood cache with unique checks
    const checks = Array.from(
      { length: 100_000 },
      (_, i) => `resource:action${i}:instance${i}`
    )

    // Should handle this gracefully
    checks.forEach((check) => {
      expect(manager.isPermitted(check)).toBe(true)
    })

    // Verify system still works
    expect(manager.isPermitted('resource:new:instance')).toBe(true)
    expect(manager.isPermitted('other:view:1')).toBe(false)
  })
})
