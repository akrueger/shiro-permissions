import { ShiroPermissionManager } from '../../src'

describe('Performance', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  describe('Basic Operations', () => {
    test('should handle bulk permission grants efficiently', () => {
      const start = performance.now()

      // Generate 1000 realistic permissions
      const permissions = Array.from({ length: 1000 }, (_, i) => [
        `system:view:${i}`,
        `document:read:${i}`,
        `printer:print:${i}`,
        `user:edit:${i}`,
        `report:generate:${i}`
      ]).flat()

      // Grant permissions
      manager.grantPermissions(permissions)

      const end = performance.now()
      const duration = end - start

      // Should process 5000 permissions in under 100ms
      expect(duration).toBeLessThan(100)
    })

    test('should handle rapid permission checks efficiently', () => {
      // Setup some base permissions
      manager.grantPermissions([
        'system:*:*',
        'document:read,write:*',
        'printer:print:*',
        'user:view,edit:123',
        'report:*:public'
      ])

      const start = performance.now()

      // Perform 10000 permission checks
      for (let i = 0; i < 10000; i++) {
        manager.isPermitted('system:view:1')
        manager.isPermitted('document:read:secret')
        manager.isPermitted('printer:print:hp1')
        manager.isPermitted('user:view:123')
        manager.isPermitted('report:generate:public')
      }

      const end = performance.now()
      const duration = end - start

      // Should perform 50000 checks in under 500ms
      expect(duration).toBeLessThan(500)
    })
  })

  describe('Cache Performance', () => {
    test('should demonstrate cache effectiveness', () => {
      // Setup permissions
      manager.grantPermissions([
        'system:*:*',
        'document:read,write:*',
        'printer:print:*'
      ])

      // First round - no cache
      const uncachedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        manager.isPermitted('system:view:1')
        manager.isPermitted('document:read:secret')
        manager.isPermitted('printer:print:hp1')
      }
      const uncachedDuration = performance.now() - uncachedStart

      // Second round - with cache
      const cachedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        manager.isPermitted('system:view:1')
        manager.isPermitted('document:read:secret')
        manager.isPermitted('printer:print:hp1')
      }
      const cachedDuration = performance.now() - cachedStart

      // Cached operations should be significantly faster (at least 2x)
      expect(cachedDuration).toBeLessThan(uncachedDuration / 2)
    })
  })

  describe('Wildcard Resolution', () => {
    test('should handle complex wildcard resolution efficiently', () => {
      // Setup hierarchical permissions with wildcards
      manager.grantPermissions([
        'system:*:*',
        'department:hr:*',
        'department:finance:*',
        'project:dev:*',
        'document:*:public',
        'printer:print:*',
        'user:view,edit,delete:*',
        'report:generate,export:*'
      ])

      const start = performance.now()

      // Perform checks with varying complexity
      for (let i = 0; i < 1000; i++) {
        // Direct wildcard matches
        manager.isPermitted('system:view:any')
        manager.isPermitted('department:hr:employees')

        // Multi-part wildcards
        manager.isPermitted('document:read:public')
        manager.isPermitted('printer:print:hp1')

        // Subpart combinations
        manager.isPermitted('user:view:123')
        manager.isPermitted('report:generate:q4')

        // Non-matches (important for performance testing)
        manager.isPermitted('system:unknown:action')
        manager.isPermitted('department:unknown:area')
        manager.isPermitted('document:delete:private')
      }

      const duration = performance.now() - start

      // Should perform 10000 complex wildcard checks in under 200ms
      expect(duration).toBeLessThan(200)
    })
  })

  describe('Memory Usage', () => {
    test('should handle moderate permission sets efficiently', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Create a moderate-sized permission set
      const permissions = Array.from({ length: 1000 }, (_, i) => [
        `system:view:${i}`,
        `document:read:${i}`,
        `printer:print:${i}`
      ]).flat()

      manager.grantPermissions(permissions)

      // Perform some operations
      for (let i = 0; i < 1000; i++) {
        manager.isPermitted(`system:view:${i}`)
        manager.isPermitted(`document:read:${i}`)
        manager.isPermitted(`printer:print:${i}`)
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable for 3000 permissions
      // and 3000 permission checks (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('Real-world Scenarios', () => {
    test('should handle typical RBAC patterns efficiently', () => {
      // Setup realistic RBAC permissions
      const roles = [
        // Admin role
        'system:*:*',
        'admin:*:*',

        // Manager role
        'department:view,edit:*',
        'user:view,edit:*',
        'report:generate,export:*',

        // User role
        'document:read,write:owned',
        'profile:edit:self',
        'report:view:*'
      ]

      const start = performance.now()

      // Grant role permissions
      manager.grantPermissions(roles)

      // Simulate permission checks for different roles
      for (let i = 0; i < 1000; i++) {
        // Admin checks
        manager.isPermitted('system:configure:app')
        manager.isPermitted('admin:manage:users')

        // Manager checks
        manager.isPermitted('department:view:hr')
        manager.isPermitted('user:edit:employee123')
        manager.isPermitted('report:generate:monthly')

        // User checks
        manager.isPermitted('document:read:owned')
        manager.isPermitted('profile:edit:self')
        manager.isPermitted('report:view:public')

        // Unauthorized attempts
        manager.isPermitted('system:delete:app')
        manager.isPermitted('admin:grant:permissions')
      }

      const duration = performance.now() - start

      // Should perform role setup and 10000 checks in under 200ms
      expect(duration).toBeLessThan(200)
    })
  })
})
