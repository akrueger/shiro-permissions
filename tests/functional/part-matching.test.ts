import { ShiroPermissionManager } from '../../src'

describe('Shiro Part Matching', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('exact part count matching', () => {
    manager.grantPermissions(['user:view:1'])

    // Must match exact number of parts
    expect(manager.isPermitted('user:view:1')).toBe(true)
    expect(manager.isPermitted('user:view')).toBe(false)
    expect(manager.isPermitted('user:view:1:detail')).toBe(false)
  })

  test('part level wildcards', () => {
    manager.grantPermissions(['user:*:1'])

    // Wildcard only matches its part level
    expect(manager.isPermitted('user:view:1')).toBe(true)
    expect(manager.isPermitted('user:edit:1')).toBe(true)
    expect(manager.isPermitted('user:view:2')).toBe(false)
  })

  test('empty parts handling', () => {
    // Empty parts should be rejected
    expect(() => {
      manager.grantPermissions(['user::view'])
    }).toThrow()

    expect(() => {
      manager.grantPermissions(['user:view:'])
    }).toThrow()
  })
})
