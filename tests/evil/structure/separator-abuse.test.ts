import { PermissionFormatError, ShiroPermissionManager } from '../../../src'

describe('Evil: Separator Abuse', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('colon manipulation', () => {
    const colonTests = [
      ':printer:view:1', // leading colon
      'printer:view:1:', // trailing colon
      'printer::view:1', // double colon
      'printer:::view:1', // triple colon
      'printer:view:1::', // multiple trailing colons
      '::printer:view:1::', // mixed multiple colons
      ':', // single colon
      '::', // double colon only
      ':::' // multiple colons only
    ]

    colonTests.forEach((input) => {
      expect(() => manager.grantPermissions([input])).toThrow(
        PermissionFormatError
      )
    })
  })

  test('comma manipulation', () => {
    const commaTests = [
      'printer:,:view', // empty subpart
      'printer:view,:1', // trailing comma in subpart
      'printer:,view:1', // leading comma in subpart
      'printer:view,,edit:1', // double comma
      'printer:,,,view:1', // multiple commas
      'printer:view:,', // trailing comma
      ',printer:view:1' // leading comma
    ]

    commaTests.forEach((input) => {
      expect(() => manager.grantPermissions([input])).toThrow(
        PermissionFormatError
      )
    })
  })

  test('mixed separator abuse', () => {
    const mixedTests = [
      'printer,:view:1', // mixed separators
      'printer:view:,1', // mixed placement
      'printer:,:,:1', // alternating separators
      'printer,view:1', // wrong separator
      'printer:view,1', // wrong level separator
      ':,:,:' // only separators
    ]

    mixedTests.forEach((input) => {
      expect(() => manager.grantPermissions([input])).toThrow(
        PermissionFormatError
      )
    })
  })
})
