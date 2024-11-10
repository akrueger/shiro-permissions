import { ShiroPermissionManager } from '../../src'

describe('Practical Scenarios', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('admin role permissions', () => {
    manager.grantPermissions([
      'user:create,read,update,delete:*' // Admin
    ])

    // Admin permissions
    expect(manager.isPermitted('user:create:any')).toBe(true)
    expect(manager.isPermitted('user:delete:any')).toBe(true)
  })

  test('user role permissions', () => {
    manager.grantPermissions([
      'user:read,update:own' // User
    ])

    // User permissions
    expect(manager.isPermitted('user:read:own')).toBe(true)
    expect(manager.isPermitted('user:update:own')).toBe(true)
    expect(manager.isPermitted('user:update:any')).toBe(false)
  })

  test('guest role permissions', () => {
    manager.grantPermissions([
      'user:read:public' // Guest
    ])

    // Guest permissions
    expect(manager.isPermitted('user:read:public')).toBe(true)
    expect(manager.isPermitted('user:update:public')).toBe(false)
  })

  test('document management scenario', () => {
    manager.grantPermissions([
      'document:*:confidential', // Full confidential access
      'document:read,write:internal', // Internal read/write
      'document:read:public' // Public read only
    ])

    // Confidential access
    expect(manager.isPermitted('document:create:confidential')).toBe(true)
    expect(manager.isPermitted('document:delete:confidential')).toBe(true)

    // Internal access
    expect(manager.isPermitted('document:read:internal')).toBe(true)
    expect(manager.isPermitted('document:write:internal')).toBe(true)
    expect(manager.isPermitted('document:delete:internal')).toBe(false)

    // Public access
    expect(manager.isPermitted('document:read:public')).toBe(true)
    expect(manager.isPermitted('document:write:public')).toBe(false)
  })
})
