import { PermissionFormatError, ShiroPermissionManager } from '../../../src'

describe('Evil: Memory Exhaustion', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('deep permission chains', () => {
    // Create maximum depth permissions
    const maxDepth = Array(3).fill('a').join(':')
    manager.grantPermissions([maxDepth])

    // Try to exceed maximum depth
    const exceedDepth = Array(4).fill('a').join(':')
    expect(() => manager.grantPermissions([exceedDepth])).toThrow(
      PermissionFormatError
    )
  })

  test('large permission parts', () => {
    // Create maximum size parts
    const maxPart = 'a'.repeat(50)
    const validPermission = `${maxPart}:${maxPart}:${maxPart}`
    manager.grantPermissions([validPermission])

    // Try to exceed maximum part size
    const largePart = 'a'.repeat(51)
    const exceedPermission = `${largePart}:view:1`
    expect(() => manager.grantPermissions([exceedPermission])).toThrow(
      PermissionFormatError
    )
  })

  test('massive subpart lists', () => {
    // Create valid subparts within length limit
    const subparts = Array.from(
      { length: 10 },
      (_, i) => `a${i}` // Very short subparts to stay well under limit
    ).join(',')

    const permission = `resource:${subparts}:1`
    manager.grantPermissions([permission])

    // Verify system handles many subparts correctly
    expect(manager.isPermitted('resource:a0:1')).toBe(true)
    expect(manager.isPermitted('resource:a9:1')).toBe(true)
    expect(manager.isPermitted('resource:other:1')).toBe(false)
  })
})
