import { PermissionFormatError, ShiroPermissionManager } from '../../../src'

describe('Evil: Control Character', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('ASCII control characters', () => {
    // Test all ASCII control characters (0x00-0x1F, 0x7F)
    for (let i = 0; i <= 0x1f; i++) {
      const input = `printer${String.fromCharCode(i)}:view:1`
      expect(() => manager.grantPermissions([input])).toThrow(
        PermissionFormatError
      )
    }

    expect(() =>
      manager.grantPermissions([`printer${String.fromCharCode(0x7f)}:view:1`])
    ).toThrow(PermissionFormatError)
  })

  test('whitespace manipulation', () => {
    const whitespaceInputs = [
      'printer view:1', // space
      'printer\tview:1', // tab
      'printer\nview:1', // newline
      'printer\rview:1', // carriage return
      'printer\f:view:1', // form feed
      'printer\v:view:1', // vertical tab
      'printer\u00A0view:1', // non-breaking space
      'printer\u2028view:1', // line separator
      'printer\u2029view:1' // paragraph separator
    ]

    whitespaceInputs.forEach((input) => {
      expect(() => manager.grantPermissions([input])).toThrow(
        PermissionFormatError
      )
    })
  })

  test('escape sequence injection', () => {
    const escapeInputs = [
      `printer${String.fromCharCode(0x1b)}:view:1`, // escape character
      'printer\b:view:1', // backspace
      'printer\x1B:view:1', // escape in hex
      'printer\u001B:view:1' // escape in unicode
    ]

    escapeInputs.forEach((input) => {
      expect(() => manager.grantPermissions([input])).toThrow(
        PermissionFormatError
      )
    })
  })
})
