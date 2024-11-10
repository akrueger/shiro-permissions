import { ShiroPermissionManager } from '../../src'

describe('Hierarchical Permissions', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  describe('Basic Hierarchy', () => {
    test('nested resource permissions', () => {
      manager.grantPermissions(['system:user:*'])

      expect(manager.isPermitted('system:user:view')).toBe(true)
      expect(manager.isPermitted('system:user:edit')).toBe(true)
      expect(manager.isPermitted('system:admin:view')).toBe(false)
    })

    test('multi-level wildcards', () => {
      manager.grantPermissions(['system:*:view'])

      expect(manager.isPermitted('system:user:view')).toBe(true)
      expect(manager.isPermitted('system:admin:view')).toBe(true)
      expect(manager.isPermitted('system:user:edit')).toBe(false)
    })

    test('specific overrides', () => {
      manager.grantPermissions([
        'system:*:view', // General view permission
        'system:user:edit' // Specific edit permission
      ])

      expect(manager.isPermitted('system:admin:view')).toBe(true)
      expect(manager.isPermitted('system:user:view')).toBe(true)
      expect(manager.isPermitted('system:user:edit')).toBe(true)
      expect(manager.isPermitted('system:admin:edit')).toBe(false)
    })
  })

  describe('Role Hierarchies', () => {
    beforeEach(() => {
      manager.grantPermissions([
        // Admin role - full access
        'system:*:*',
        // Manager role - department management
        'department:*:view,edit',
        // User role - limited access
        'document:read,write:owned'
      ])
    })

    test('admin role permissions', () => {
      expect(manager.isPermitted('system:user:create')).toBe(true)
      expect(manager.isPermitted('system:config:edit')).toBe(true)
      expect(manager.isPermitted('system:admin:delete')).toBe(true)
    })

    test('manager role permissions', () => {
      expect(manager.isPermitted('department:hr:view')).toBe(true)
      expect(manager.isPermitted('department:finance:edit')).toBe(true)
      expect(manager.isPermitted('department:hr:delete')).toBe(false)
    })

    test('user role permissions', () => {
      expect(manager.isPermitted('document:read:owned')).toBe(true)
      expect(manager.isPermitted('document:write:owned')).toBe(true)
      expect(manager.isPermitted('document:delete:owned')).toBe(false)
    })
  })

  describe('Resource Hierarchies', () => {
    beforeEach(() => {
      manager.grantPermissions([
        'document:*:public', // All actions on public documents
        'document:read,write:private', // Read/write private documents
        'document:read:confidential' // Only read confidential documents
      ])
    })

    test('public resource permissions', () => {
      expect(manager.isPermitted('document:read:public')).toBe(true)
      expect(manager.isPermitted('document:write:public')).toBe(true)
      expect(manager.isPermitted('document:delete:public')).toBe(true)
    })

    test('private resource permissions', () => {
      expect(manager.isPermitted('document:read:private')).toBe(true)
      expect(manager.isPermitted('document:write:private')).toBe(true)
      expect(manager.isPermitted('document:delete:private')).toBe(false)
    })

    test('confidential resource permissions', () => {
      expect(manager.isPermitted('document:read:confidential')).toBe(true)
      expect(manager.isPermitted('document:write:confidential')).toBe(false)
      expect(manager.isPermitted('document:delete:confidential')).toBe(false)
    })
  })

  describe('Complex Hierarchies', () => {
    beforeEach(() => {
      manager.grantPermissions([
        // Organization-wide permissions
        'org:admin:*:*', // Admin full access
        'org:manager:reports:*', // Manager report access
        // Department-specific permissions
        'org:hr:employees:view,edit', // HR employee access
        'org:finance:budget:*', // Finance budget access
        // Project-specific permissions
        'project:lead:*:manage', // Project lead management
        'project:dev:code:read,write' // Developer code access
      ])
    })

    test('organization level permissions', () => {
      expect(manager.isPermitted('org:admin:system:configure')).toBe(true)
      expect(manager.isPermitted('org:manager:reports:generate')).toBe(true)
      expect(manager.isPermitted('org:manager:system:configure')).toBe(false)
    })

    test('department level permissions', () => {
      expect(manager.isPermitted('org:hr:employees:view')).toBe(true)
      expect(manager.isPermitted('org:hr:employees:delete')).toBe(false)
      expect(manager.isPermitted('org:finance:budget:view')).toBe(true)
    })

    test('project level permissions', () => {
      expect(manager.isPermitted('project:lead:team1:manage')).toBe(true)
      expect(manager.isPermitted('project:dev:code:write')).toBe(true)
      expect(manager.isPermitted('project:dev:code:delete')).toBe(false)
    })
  })

  describe('Permission Inheritance', () => {
    beforeEach(() => {
      manager.grantPermissions([
        'app:admin:users:*', // All user operations
        'app:admin:settings:read,write', // Settings access
        'app:user:profile:*', // All profile operations
        'app:user:settings:read' // Read-only settings
      ])
    })

    test('direct permissions take precedence', () => {
      expect(manager.isPermitted('app:admin:users:delete')).toBe(true)
      expect(manager.isPermitted('app:admin:settings:write')).toBe(true)
      expect(manager.isPermitted('app:admin:settings:delete')).toBe(false)
    })

    test('inherited permissions', () => {
      expect(manager.isPermitted('app:user:profile:edit')).toBe(true)
      expect(manager.isPermitted('app:user:settings:read')).toBe(true)
      expect(manager.isPermitted('app:user:settings:write')).toBe(false)
    })

    test('permission isolation', () => {
      // Verify permissions don't leak across hierarchies
      expect(manager.isPermitted('app:user:users:delete')).toBe(false)
      expect(manager.isPermitted('app:admin:profile:edit')).toBe(false)
    })
  })
})
