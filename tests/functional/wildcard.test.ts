import { PermissionFormatError, ShiroPermissionManager } from '../../src'

describe('Wildcard Permissions', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  describe('Validation Rules', () => {
    test('invalid wildcard patterns', () => {
      const invalidPatterns = [
        '*', // Single wildcard not allowed (explicit in WildcardPermission.java)
        'printer:*,view', // Wildcard cannot be mixed with subparts
        'printer:view*', // Wildcard must be standalone
        '*printer', // Wildcard must be standalone
        'printer,*:view', // Wildcard cannot be in subpart list
        '**:view:1', // Double wildcard not allowed
        'printer:**:1', // Double wildcard not allowed
        'printer:.*:1', // Regex-like attempts not allowed
        'printer:.+:1', // Regex-like attempts not allowed
        'printer:??:1', // Glob patterns not allowed
        'printer:[a-z]:1', // Character classes not allowed
        'printer:{view,edit}:1', // Glob alternatives not allowed
        'printer:(view|edit):1' // Regex alternatives not allowed
      ]

      invalidPatterns.forEach((pattern) => {
        expect(() => manager.grantPermissions([pattern])).toThrow(
          PermissionFormatError
        )
      })
    })

    test('valid wildcard patterns', () => {
      const validPatterns = [
        'printer:*:*', // Multiple wildcards in different parts
        'printer:*', // Single part wildcard
        '*:view:public', // Leading wildcard with fixed parts
        'printer:print:*', // Trailing wildcard
        'resource:*:id:*' // Wildcards with fixed parts between
      ]

      validPatterns.forEach((pattern) => {
        expect(() => manager.grantPermissions([pattern])).not.toThrow()
      })
    })
  })

  describe('Basic Wildcard Behavior', () => {
    beforeEach(() => {
      manager.grantPermissions([
        'printer:*', // All printer actions
        'scanner:scan:*', // All scan instances
        '*:view:public' // View all public resources
      ])
    })

    test('domain level wildcards', () => {
      expect(manager.isPermitted('printer:print')).toBe(true)
      expect(manager.isPermitted('printer:scan')).toBe(true)
      expect(manager.isPermitted('scanner:print')).toBe(false)
    })

    test('action level wildcards', () => {
      expect(manager.isPermitted('scanner:scan:hp1')).toBe(true)
      expect(manager.isPermitted('scanner:scan:epson')).toBe(true)
      expect(manager.isPermitted('scanner:print:hp1')).toBe(false)
    })

    test('instance level wildcards', () => {
      expect(manager.isPermitted('document:view:public')).toBe(true)
      expect(manager.isPermitted('printer:view:public')).toBe(true)
      expect(manager.isPermitted('document:edit:public')).toBe(false)
    })
  })

  describe('Wildcard Implications', () => {
    test('domain wildcard implications', () => {
      manager.grantPermissions(['system:*'])

      expect(manager.isPermitted('system:user')).toBe(true)
      expect(manager.isPermitted('system:admin')).toBe(true)
      expect(manager.isPermitted('other:user')).toBe(false)
    })

    test('action wildcard implications', () => {
      manager.grantPermissions(['system:user:*'])

      expect(manager.isPermitted('system:user:view')).toBe(true)
      expect(manager.isPermitted('system:user:edit')).toBe(true)
      expect(manager.isPermitted('system:admin:view')).toBe(false)
    })

    test('instance wildcard implications', () => {
      manager.grantPermissions(['system:user:view:*'])

      expect(manager.isPermitted('system:user:view:1')).toBe(true)
      expect(manager.isPermitted('system:user:view:any')).toBe(true)
      expect(manager.isPermitted('system:user:edit:1')).toBe(false)
    })
  })

  describe('Wildcard with Subparts', () => {
    test('wildcard with action subparts', () => {
      manager.grantPermissions(['document:read,write:*'])

      expect(manager.isPermitted('document:read:secret')).toBe(true)
      expect(manager.isPermitted('document:write:public')).toBe(true)
      expect(manager.isPermitted('document:delete:public')).toBe(false)
    })

    test('wildcard with instance subparts', () => {
      manager.grantPermissions(['printer:print:public,private'])

      expect(manager.isPermitted('printer:print:public')).toBe(true)
      expect(manager.isPermitted('printer:print:private')).toBe(true)
      expect(manager.isPermitted('printer:print:confidential')).toBe(false)
    })
  })

  describe('Complex Wildcard Scenarios', () => {
    beforeEach(() => {
      manager.grantPermissions([
        'system:admin:*:*', // All admin operations
        'system:user:read:*', // All user read operations
        'system:*:view:public', // View any public resource
        'system:report:generate,delete:*' // Generate/delete any report
      ])
    })

    test('multiple wildcard levels', () => {
      expect(manager.isPermitted('system:admin:user:delete')).toBe(true)
      expect(manager.isPermitted('system:admin:config:edit')).toBe(true)
      expect(manager.isPermitted('system:user:write:profile')).toBe(false)
    })

    test('mixed wildcards and subparts', () => {
      expect(manager.isPermitted('system:report:generate:annual')).toBe(true)
      expect(manager.isPermitted('system:report:delete:monthly')).toBe(true)
      expect(manager.isPermitted('system:report:update:daily')).toBe(false)
    })

    test('wildcard precedence', () => {
      // Test that more specific permissions take precedence
      manager.grantPermissions(['printer:print:confidential'])

      expect(manager.isPermitted('printer:print:confidential')).toBe(true)
      // Even with a wildcard, shouldn't grant other actions on confidential
      expect(manager.isPermitted('printer:configure:confidential')).toBe(false)
    })
  })

  describe('Role-Based Wildcard Patterns', () => {
    beforeEach(() => {
      manager.grantPermissions([
        'admin:*', // Admin can do anything
        'manager:view,edit,create:*', // Manager has limited actions
        'user:view:own,public' // User can only view own and public
      ])
    })

    test('admin role permissions', () => {
      expect(manager.isPermitted('admin:create')).toBe(true)
      expect(manager.isPermitted('admin:delete')).toBe(true)
      expect(manager.isPermitted('admin:any')).toBe(true)
    })

    test('manager role permissions', () => {
      expect(manager.isPermitted('manager:view:any')).toBe(true)
      expect(manager.isPermitted('manager:edit:any')).toBe(true)
      expect(manager.isPermitted('manager:delete:any')).toBe(false)
    })

    test('user role permissions', () => {
      expect(manager.isPermitted('user:view:own')).toBe(true)
      expect(manager.isPermitted('user:view:public')).toBe(true)
      expect(manager.isPermitted('user:view:other')).toBe(false)
      expect(manager.isPermitted('user:edit:own')).toBe(false)
    })
  })
})
