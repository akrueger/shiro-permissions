import { PermissionFormatError, ShiroPermissionManager } from '../../src'

describe('Permission Parts', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  describe('Part Structure', () => {
    test('exact part count matching', () => {
      manager.grantPermissions(['user:view:1'])

      // Must match exact number of parts per Shiro's WildcardPermission
      expect(manager.isPermitted('user:view:1')).toBe(true)
      expect(manager.isPermitted('user:view')).toBe(false) // Too few parts
      expect(manager.isPermitted('user:view:1:detail')).toBe(false) // Too many parts
    })

    test('empty parts validation', () => {
      const invalidEmptyParts = [
        'user::view', // Empty middle part
        'user:view:', // Empty end part
        ':user:view', // Empty start part
        '::', // All empty parts
        'user:view::1' // Empty internal part
      ]

      invalidEmptyParts.forEach((permission) => {
        expect(() => manager.grantPermissions([permission])).toThrow(
          PermissionFormatError
        )
      })
    })

    test('part length limits', () => {
      // Valid - 50 character part (max allowed)
      const maxLengthPart = 'a'.repeat(50)
      expect(() =>
        manager.grantPermissions([`${maxLengthPart}:view:1`])
      ).not.toThrow()

      // Invalid - 51 character part
      const tooLongPart = 'a'.repeat(51)
      expect(() => manager.grantPermissions([`${tooLongPart}:view:1`])).toThrow(
        PermissionFormatError
      )
    })

    test('valid characters in parts', () => {
      // Testing valid character patterns per Shiro's PERMISSION_PART_REGEX
      const validParts = [
        'printer-123:view:1', // Hyphens
        'scanner_456:scan:test-2', // Underscores
        'PRINTER:VIEW:1', // Uppercase
        'printer123:view:1', // Numbers
        'printer:view,print:1' // Commas in subparts
      ]

      validParts.forEach((permission) => {
        expect(() => manager.grantPermissions([permission])).not.toThrow()
      })

      // Testing invalid characters
      const invalidParts = [
        'printer@:view:1', // @ symbol
        'printer.scan:view:1', // Period
        'printer#:view:1', // Hash
        'printer/:view:1', // Forward slash
        'printer\\:view:1', // Backslash
        'printer :view:1' // Space
      ]

      invalidParts.forEach((permission) => {
        expect(() => manager.grantPermissions([permission])).toThrow(
          PermissionFormatError
        )
      })
    })
  })

  describe('Subpart Behavior', () => {
    test('basic subpart matching', () => {
      manager.grantPermissions(['printer:print,query:*'])

      expect(manager.isPermitted('printer:print:hp1')).toBe(true)
      expect(manager.isPermitted('printer:query:hp1')).toBe(true)
      expect(manager.isPermitted('printer:print,query:hp1')).toBe(false) // Must match exactly one subpart
      expect(manager.isPermitted('printer:configure:hp1')).toBe(false)
    })

    test('multiple subpart permissions', () => {
      manager.grantPermissions(['document:read,write,delete:public'])

      expect(manager.isPermitted('document:read:public')).toBe(true)
      expect(manager.isPermitted('document:write:public')).toBe(true)
      expect(manager.isPermitted('document:delete:public')).toBe(true)
      expect(manager.isPermitted('document:update:public')).toBe(false)
      // Verify combinations aren't permitted
      expect(manager.isPermitted('document:read,write:public')).toBe(false)
    })

    test('subpart order independence', () => {
      // Per Shiro's WildcardPermission, order shouldn't matter
      manager.grantPermissions(['document:write,read,delete:public'])

      expect(manager.isPermitted('document:read:public')).toBe(true)
      expect(manager.isPermitted('document:write:public')).toBe(true)
      expect(manager.isPermitted('document:delete:public')).toBe(true)
    })

    test('multiple levels with subparts', () => {
      manager.grantPermissions([
        'document:read,write:public,private',
        'printer:print,scan:hp1,hp2'
      ])

      // Document permissions
      expect(manager.isPermitted('document:read:public')).toBe(true)
      expect(manager.isPermitted('document:write:private')).toBe(true)
      expect(manager.isPermitted('document:read:confidential')).toBe(false)

      // Printer permissions
      expect(manager.isPermitted('printer:print:hp1')).toBe(true)
      expect(manager.isPermitted('printer:scan:hp2')).toBe(true)
      expect(manager.isPermitted('printer:print:hp3')).toBe(false)
    })

    test('subpart wildcards', () => {
      manager.grantPermissions([
        'printer:*:public', // Any action on public printer
        'scanner:scan,query:*' // Specific actions on any scanner
      ])

      // Printer permissions
      expect(manager.isPermitted('printer:print:public')).toBe(true)
      expect(manager.isPermitted('printer:configure:public')).toBe(true)
      expect(manager.isPermitted('printer:print:private')).toBe(false)

      // Scanner permissions
      expect(manager.isPermitted('scanner:scan:any')).toBe(true)
      expect(manager.isPermitted('scanner:query:any')).toBe(true)
      expect(manager.isPermitted('scanner:configure:any')).toBe(false)
    })

    test('subpart duplication handling', () => {
      // Duplicate subparts should be effectively deduplicated
      manager.grantPermissions(['document:read,read,read:public,public'])

      expect(manager.isPermitted('document:read:public')).toBe(true)
      expect(manager.isPermitted('document:write:public')).toBe(false)
    })

    test('subpart boundary validation', () => {
      // Invalid subpart patterns
      const invalidSubparts = [
        'printer:,:view', // Empty subpart
        'printer:view,:1', // Trailing comma
        'printer:,view:1', // Leading comma
        'printer:view,,edit:1', // Double comma
        'printer:,,,view:1', // Multiple commas
        'printer:view:,', // Trailing comma
        ',printer:view:1', // Leading comma
        'printer:*,view:1' // Wildcard mixed with other subparts
      ]

      invalidSubparts.forEach((permission) => {
        expect(() => manager.grantPermissions([permission])).toThrow(
          PermissionFormatError
        )
      })
    })
  })

  describe('Combined Part and Subpart Matching', () => {
    beforeEach(() => {
      manager.grantPermissions([
        'system:admin:*', // All admin actions
        'system:user:read,write', // Specific user actions
        'document:*:public,internal', // All actions on public/internal docs
        'printer:print,scan:*' // Specific actions on all printers
      ])
    })

    test('wildcard and subpart combinations', () => {
      // Admin permissions (wildcard)
      expect(manager.isPermitted('system:admin:anything')).toBe(true)

      // User permissions (specific subparts)
      expect(manager.isPermitted('system:user:read')).toBe(true)
      expect(manager.isPermitted('system:user:write')).toBe(true)
      expect(manager.isPermitted('system:user:delete')).toBe(false)

      // Document permissions (wildcard with specific instances)
      expect(manager.isPermitted('document:read:public')).toBe(true)
      expect(manager.isPermitted('document:write:internal')).toBe(true)
      expect(manager.isPermitted('document:delete:confidential')).toBe(false)

      // Printer permissions (specific actions with wildcard instance)
      expect(manager.isPermitted('printer:print:hp1')).toBe(true)
      expect(manager.isPermitted('printer:scan:epson')).toBe(true)
      expect(manager.isPermitted('printer:configure:hp1')).toBe(false)
    })

    test('subpart interaction with part levels', () => {
      manager.grantPermissions([
        'app:admin:users:create,delete', // Admin user management
        'app:user:profile:read,write:*' // Profile management
      ])

      expect(manager.isPermitted('app:admin:users:create')).toBe(true)
      expect(manager.isPermitted('app:admin:users:delete')).toBe(true)
      expect(manager.isPermitted('app:admin:users:update')).toBe(false)

      expect(manager.isPermitted('app:user:profile:read:personal')).toBe(true)
      expect(manager.isPermitted('app:user:profile:write:work')).toBe(true)
      expect(manager.isPermitted('app:user:profile:delete:personal')).toBe(
        false
      )
    })
  })

  describe('Edge Cases', () => {
    test('maximum subpart combinations', () => {
      // Test with many subparts
      const manySubparts = Array.from(
        { length: 100 },
        (_, i) => `action${i}`
      ).join(',')

      // Should handle large number of subparts
      manager.grantPermissions([`resource:${manySubparts}:target`])

      // Verify random subparts work
      expect(manager.isPermitted('resource:action0:target')).toBe(true)
      expect(manager.isPermitted('resource:action50:target')).toBe(true)
      expect(manager.isPermitted('resource:action99:target')).toBe(true)
      expect(manager.isPermitted('resource:other:target')).toBe(false)
    })

    test('complex subpart combinations', () => {
      manager.grantPermissions([
        'complex:read,write,delete:public,private,*', // Mixed wildcards and specific values
        'system:admin,user:create,delete,*' // Mixed roles and actions with wildcard
      ])

      // Test various combinations
      expect(manager.isPermitted('complex:read:public')).toBe(true)
      expect(manager.isPermitted('complex:write:private')).toBe(true)
      expect(manager.isPermitted('complex:delete:secret')).toBe(true) // Matched by *

      expect(manager.isPermitted('system:admin:create')).toBe(true)
      expect(manager.isPermitted('system:user:delete')).toBe(true)
      expect(manager.isPermitted('system:admin:configure')).toBe(true) // Matched by *
    })
  })
})
