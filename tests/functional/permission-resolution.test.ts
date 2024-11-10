import { ShiroPermissionManager } from '../../src'

describe('Shiro Permission Resolution', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('multiple permission resolution', () => {
    manager.grantPermissions([
      'user:view:*',
      'user:create,edit:1',
      'printer:*:1'
    ])

    // Most specific match should win
    expect(manager.isPermitted('user:view:1')).toBe(true)
    expect(manager.isPermitted('user:create:1')).toBe(true)
    expect(manager.isPermitted('user:edit:1')).toBe(true)

    // Should respect wildcard at correct level
    expect(manager.isPermitted('printer:print:1')).toBe(true)
    expect(manager.isPermitted('printer:query:1')).toBe(true)
  })

  test('implies relationship', () => {
    manager.grantPermissions(['user:*:1'])

    // More general should imply more specific at same level
    expect(manager.isPermitted('user:view:1')).toBe(true)
    expect(manager.isPermitted('user:edit:1')).toBe(true)

    // But not vice versa
    manager.clear()
    manager.grantPermissions(['user:view:1'])
    expect(manager.isPermitted('user:*:1')).toBe(false)
  })
})
