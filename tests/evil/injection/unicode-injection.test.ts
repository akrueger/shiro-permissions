import { PermissionFormatError, ShiroPermissionManager } from '../../../src'

describe('Evil: Unicode Injection', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('unicode and emoji injection', () => {
    const maliciousInputs = [
      'printer:🖨️:view',
      'user:👤:admin',
      '프린터:보기:1',
      'принтер:вид:1',
      'システム:表示:1',
      '🔑:admin:*'
    ]

    maliciousInputs.forEach((input) => {
      expect(() => manager.grantPermissions([input])).toThrow(
        PermissionFormatError
      )
    })
  })

  test('zero-width character injection', () => {
    const zeroWidthInputs = [
      'printer:​view:1', // zero-width space
      'printer:‌view:1', // zero-width non-joiner
      'printer:‍view:1', // zero-width joiner
      'prin‎ter:view:1', // left-to-right mark
      'prin‏ter:view:1', // right-to-left mark
      'printer\u200B:view:1' // zero-width space by code point
    ]

    zeroWidthInputs.forEach((input) => {
      expect(() => manager.grantPermissions([input])).toThrow(
        PermissionFormatError
      )
    })
  })

  test('unicode normalization attacks', () => {
    const normalizationPairs = [
      ['café:view:1', 'cafe\u0301:view:1'],
      ['ñ:view:1', 'n\u0303:view:1'],
      ['à:view:1', 'a\u0300:view:1'],
      ['prínter:view:1', 'pri\u0301nter:view:1']
    ]

    normalizationPairs.forEach(([composed, decomposed]) => {
      expect(() => manager.grantPermissions([composed])).toThrow()
      expect(() => manager.grantPermissions([decomposed])).toThrow()
      expect(() =>
        manager.grantPermissions([composed.normalize('NFD')])
      ).toThrow()
      expect(() =>
        manager.grantPermissions([decomposed.normalize('NFC')])
      ).toThrow()
    })
  })
})
