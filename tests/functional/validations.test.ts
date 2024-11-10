import { PermissionFormatError, ShiroPermissionManager } from '../../src'

describe('Permission Validation', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('empty permissions', () => {
    expect(() => manager.grantPermissions([''])).toThrow(PermissionFormatError)
    expect(() => manager.grantPermissions([])).not.toThrow()
  })

  test('invalid characters', () => {
    expect(() => manager.grantPermissions(['printer@:print'])).toThrow(
      PermissionFormatError
    )
    expect(() => manager.grantPermissions(['printer:print#'])).toThrow(
      PermissionFormatError
    )
  })

  test('valid permission formats', () => {
    expect(() =>
      manager.grantPermissions([
        'printer-123:print_test:instance-1',
        'scanner_456:scan:test-2'
      ])
    ).not.toThrow()
  })

  test('permission part count', () => {
    expect(() => manager.grantPermissions(['single'])).not.toThrow()
    expect(() => manager.grantPermissions(['one:two'])).not.toThrow()
    expect(() => manager.grantPermissions(['one:two:three'])).not.toThrow()
    expect(() => manager.grantPermissions(['one:two:three:four'])).toThrow(
      PermissionFormatError
    )
  })

  test('part length limits', () => {
    // Exactly 50 characters should be allowed
    const exactLength = 'a'.repeat(50)
    expect(() =>
      manager.grantPermissions([`${exactLength}:view:1`])
    ).not.toThrow()

    // 51 characters should be rejected
    const tooLong = 'a'.repeat(51)
    expect(() => manager.grantPermissions([`${tooLong}:view:1`])).toThrow(
      PermissionFormatError
    )

    // Test length limit applies to each part
    expect(() =>
      manager.grantPermissions([
        `${'a'.repeat(50)}:${'b'.repeat(50)}:${'c'.repeat(50)}`
      ])
    ).not.toThrow()

    // Test length limit with subparts
    const subpartsAtLimit = `a${'b'.repeat(47)}c` // 49 chars plus comma = 50
    expect(() =>
      manager.grantPermissions([`resource:${subpartsAtLimit},d:1`])
    ).not.toThrow()

    const subpartsTooLong = `a${'b'.repeat(48)}c` // 50 chars plus comma = 51
    expect(() =>
      manager.grantPermissions([`resource:${subpartsTooLong},d:1`])
    ).toThrow(PermissionFormatError)
  })
})
