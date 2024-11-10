import { ShiroPermissionManager } from '../../src'

describe('Case Sensitivity', () => {
  describe('Default Behavior (Case Insensitive)', () => {
    let manager: ShiroPermissionManager

    beforeEach(() => {
      manager = new ShiroPermissionManager()
    })

    test('matches permissions regardless of case', () => {
      manager.grantPermissions(['User:View:1'])

      // All these should match since default is case-insensitive
      expect(manager.isPermitted('User:View:1')).toBe(true)
      expect(manager.isPermitted('user:view:1')).toBe(true)
      expect(manager.isPermitted('USER:VIEW:1')).toBe(true)
      expect(manager.isPermitted('uSeR:ViEw:1')).toBe(true)
    })

    test('handles wildcards case-insensitively', () => {
      manager.grantPermissions(['User:*:1'])

      expect(manager.isPermitted('User:View:1')).toBe(true)
      expect(manager.isPermitted('user:view:1')).toBe(true)
      expect(manager.isPermitted('USER:VIEW:1')).toBe(true)
    })

    test('handles subparts case-insensitively', () => {
      manager.grantPermissions(['User:View,Edit:1'])

      expect(manager.isPermitted('User:View:1')).toBe(true)
      expect(manager.isPermitted('user:view:1')).toBe(true)
      expect(manager.isPermitted('User:EDIT:1')).toBe(true)
      expect(manager.isPermitted('user:edit:1')).toBe(true)
    })
  })

  describe('Case Sensitive Mode', () => {
    let manager: ShiroPermissionManager

    beforeEach(() => {
      manager = new ShiroPermissionManager({ caseSensitive: true })
    })

    test('requires exact case match', () => {
      manager.grantPermissions(['User:View:1'])

      // Only exact match should work
      expect(manager.isPermitted('User:View:1')).toBe(true)
      expect(manager.isPermitted('user:view:1')).toBe(false)
      expect(manager.isPermitted('USER:VIEW:1')).toBe(false)
      expect(manager.isPermitted('uSeR:ViEw:1')).toBe(false)
    })

    test('handles wildcards case-sensitively', () => {
      manager.grantPermissions(['User:*:1'])

      expect(manager.isPermitted('User:View:1')).toBe(true)
      expect(manager.isPermitted('user:View:1')).toBe(false)
      expect(manager.isPermitted('User:view:1')).toBe(true)
    })

    test('handles subparts case-sensitively', () => {
      manager.grantPermissions(['User:View,Edit:1'])

      expect(manager.isPermitted('User:View:1')).toBe(true)
      expect(manager.isPermitted('user:View:1')).toBe(false)
      expect(manager.isPermitted('User:Edit:1')).toBe(true)
      expect(manager.isPermitted('User:edit:1')).toBe(false)
    })
  })
})
