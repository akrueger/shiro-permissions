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
        'printer:*', // Two-part wildcard
        'printer:*:*', // Three-part wildcard
        'printer:view:*', // Wildcard in last position
        '*:view:1' // Wildcard in first position
      ]

      validPatterns.forEach((pattern) => {
        expect(() => manager.grantPermissions([pattern])).not.toThrow()
      })
    })
  })

  describe('Part Level Matching', () => {
    test('two-part permissions', () => {
      manager.grantPermissions(['printer:*'])

      // Should match other two-part permissions
      expect(manager.isPermitted('printer:print')).toBe(true)
      expect(manager.isPermitted('printer:scan')).toBe(true)

      // Should NOT match three-part permissions
      expect(manager.isPermitted('printer:print:1')).toBe(false)
      expect(manager.isPermitted('printer:scan:epson')).toBe(false)
    })

    test('three-part permissions', () => {
      manager.grantPermissions(['printer:print:*'])

      // Should match other three-part permissions
      expect(manager.isPermitted('printer:print:1')).toBe(true)
      expect(manager.isPermitted('printer:print:epson')).toBe(true)

      // Should NOT match two-part permissions
      expect(manager.isPermitted('printer:print')).toBe(false)
    })
  })

  describe('Wildcard Implications', () => {
    test('domain wildcards', () => {
      manager.grantPermissions(['*:view:1'])

      // Wildcard matches any domain with same parts
      expect(manager.isPermitted('printer:view:1')).toBe(true)
      expect(manager.isPermitted('scanner:view:1')).toBe(true)

      // But not different actions or instances
      expect(manager.isPermitted('printer:edit:1')).toBe(false)
      expect(manager.isPermitted('printer:view:2')).toBe(false)
    })

    test('action wildcards', () => {
      manager.grantPermissions(['printer:*:1'])

      // Matches any action for this printer/instance
      expect(manager.isPermitted('printer:print:1')).toBe(true)
      expect(manager.isPermitted('printer:scan:1')).toBe(true)

      // But not other instances
      expect(manager.isPermitted('printer:print:2')).toBe(false)
    })

    test('instance wildcards', () => {
      manager.grantPermissions(['printer:print:*'])

      // Matches any instance for this printer/action
      expect(manager.isPermitted('printer:print:1')).toBe(true)
      expect(manager.isPermitted('printer:print:epson')).toBe(true)

      // But not other actions
      expect(manager.isPermitted('printer:scan:1')).toBe(false)
    })
  })

  describe('Subpart Behavior', () => {
    test('action subparts', () => {
      manager.grantPermissions(['printer:print,scan:1'])

      // Each subpart should match individually
      expect(manager.isPermitted('printer:print:1')).toBe(true)
      expect(manager.isPermitted('printer:scan:1')).toBe(true)

      // But not as a combined permission
      expect(manager.isPermitted('printer:print,scan:1')).toBe(false)
      // And not other actions
      expect(manager.isPermitted('printer:copy:1')).toBe(false)
    })

    test('instance subparts', () => {
      manager.grantPermissions(['printer:print:1,2'])

      // Each instance should match individually
      expect(manager.isPermitted('printer:print:1')).toBe(true)
      expect(manager.isPermitted('printer:print:2')).toBe(true)

      // But not combined
      expect(manager.isPermitted('printer:print:1,2')).toBe(false)
      // And not other instances
      expect(manager.isPermitted('printer:print:3')).toBe(false)
    })
  })

  describe('Multiple Wildcards', () => {
    test('multiple level wildcards', () => {
      manager.grantPermissions(['printer:*:*'])

      // Should match any action and instance
      expect(manager.isPermitted('printer:print:1')).toBe(true)
      expect(manager.isPermitted('printer:scan:epson')).toBe(true)

      // But not other domains
      expect(manager.isPermitted('scanner:print:1')).toBe(false)
    })

    test('wildcard mixing with subparts not allowed', () => {
      // These should all throw
      expect(() => manager.grantPermissions(['printer:print,*:1'])).toThrow(
        PermissionFormatError
      )

      expect(() => manager.grantPermissions(['printer:*,print:1'])).toThrow(
        PermissionFormatError
      )

      expect(() => manager.grantPermissions(['printer:print:1,*'])).toThrow(
        PermissionFormatError
      )
    })
  })
})