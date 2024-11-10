import { PermissionFormatError, ShiroPermissionManager } from '../../../src'

describe('Evil: Wildcard Abuse', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('invalid wildcard patterns', () => {
    const invalidPatterns = [
      // Double asterisk attempts
      '**:view:1', // double wildcard
      'printer:**:1', // embedded double wildcard

      // Invalid combinations
      'printer:*,*:1', // multiple wildcards in subparts
      '*,view:*:1', // wildcard in subpart list

      // Partial wildcards
      '*printer:view:1', // partial wildcard prefix
      'printer*:view:1', // partial wildcard suffix
      'printer:v*iew:1', // embedded wildcard
      'printer:view*:1', // partial action wildcard

      // Regex-like attempts
      'printer:.*:1', // regex wildcard
      'printer:.+:1', // regex plus
      'printer:?:1', // glob single char
      'printer:??:1', // multiple glob chars
      'printer:[a-z]:1', // regex character class
      'printer:{view,edit}:1', // glob alternatives
      'printer:(view|edit):1' // regex alternatives
    ]

    invalidPatterns.forEach((pattern) => {
      expect(() => manager.grantPermissions([pattern])).toThrow(
        PermissionFormatError
      )
    })
  })

  test('single wildcard restriction', () => {
    expect(() => manager.grantPermissions(['*'])).toThrow(PermissionFormatError)
  })
})
