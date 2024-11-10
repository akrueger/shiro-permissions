import { ShiroPermissionManager } from '../../src'

describe('Cache Behavior', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('cache hit consistency', () => {
    manager.grantPermissions(['printer:print:*'])

    // First check should cache the result
    expect(manager.isPermitted('printer:print:1')).toBe(true)
    // Second check should use cache
    expect(manager.isPermitted('printer:print:1')).toBe(true)
  })

  test('cache invalidation on new permissions', () => {
    manager.grantPermissions(['printer:print:*'])
    expect(manager.isPermitted('printer:print:1')).toBe(true)

    // Adding new permissions should invalidate cache
    manager.grantPermissions(['scanner:scan:*'])
    expect(manager.isPermitted('scanner:scan:1')).toBe(true)
    expect(manager.isPermitted('printer:print:1')).toBe(true)
  })

  test('cache behavior with clear', () => {
    manager.grantPermissions(['printer:print:*'])
    expect(manager.isPermitted('printer:print:1')).toBe(true)

    manager.clear()
    expect(manager.isPermitted('printer:print:1')).toBe(false)
  })
})
