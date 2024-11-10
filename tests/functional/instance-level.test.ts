import { PermissionFormatError, ShiroPermissionManager } from '../../src'

describe('Shiro Instance Level Permissions', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('instance level matching', () => {
    manager.grantPermissions([
      'user:view:1', // Specific instance
      'user:edit:*', // Any instance
      'printer:print:epson', // Specific printer
      'printer:print:*' // Any printer
    ])

    // Specific instances
    expect(manager.isPermitted('user:view:1')).toBe(true)
    expect(manager.isPermitted('user:view:2')).toBe(false)
    expect(manager.isPermitted('printer:print:epson')).toBe(true)
    expect(manager.isPermitted('printer:print:hp')).toBe(true)

    // Wildcard instances
    expect(manager.isPermitted('user:edit:any')).toBe(true)
    expect(manager.isPermitted('user:edit:123')).toBe(true)
    expect(manager.isPermitted('printer:print:xerox')).toBe(true) // matched by printer:print:*

    // Non-granted permissions
    expect(manager.isPermitted('user:delete:1')).toBe(false)
    expect(manager.isPermitted('scanner:scan:epson')).toBe(false)
  })

  test('invalid instance patterns should be rejected', () => {
    // These should all throw as they're not Shiro-compatible
    expect(() => manager.grantPermissions(['printer:print:hp-*'])).toThrow(
      PermissionFormatError
    )
    expect(() => manager.grantPermissions(['printer:print:*-suffix'])).toThrow(
      PermissionFormatError
    )
    expect(() =>
      manager.grantPermissions(['printer:print:prefix-*-suffix'])
    ).toThrow(PermissionFormatError)
  })
})
