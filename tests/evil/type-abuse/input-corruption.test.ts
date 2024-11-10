import { PermissionFormatError, ShiroPermissionManager } from '../../../src'

// tests/evil/type-abuse/input-corruption.test.ts
describe('Evil: Input Corruption', () => {
  let manager: ShiroPermissionManager

  beforeEach(() => {
    manager = new ShiroPermissionManager()
  })

  test('array corruption', () => {
    const maliciousArrays = [
      { length: 1, 0: 'printer:view:1' }, // Array-like object
      { ...['printer:view:1'] }, // Spread object
      Object.create(Array.prototype, {
        // Custom array-like
        length: { value: 1 },
        0: { value: 'printer:view:1' }
      }),
      new Proxy([], {
        // Proxy array
        get: (target, prop) => (prop === 'length' ? 1 : 'printer:view:1')
      }),
      Object.assign([], { 0: 'printer:view:1' }), // Modified array
      null, // null
      undefined, // undefined
      {}, // plain object
      42, // number
      'not an array', // string
      new Set(['printer:view:1']), // Set
      new Map([[0, 'printer:view:1']]) // Map
    ]

    maliciousArrays.forEach((arr) => {
      expect(() => manager.grantPermissions(arr as any)).toThrow(
        PermissionFormatError
      )
    })
  })

  test('object method corruption', () => {
    const maliciousObjects = [
      {
        toString: () => 'printer:view:1',
        valueOf: () => 'printer:view:1'
      },
      {
        [Symbol.toPrimitive]: () => 'printer:view:1'
      },
      new String('printer:view:1'),
      new Proxy(
        {},
        {
          get: () => 'printer:view:1'
        }
      ),
      Object.create(null, {
        toString: {
          value: () => 'printer:view:1'
        }
      })
    ]

    maliciousObjects.forEach((obj) => {
      expect(() => manager.grantPermissions([obj as any])).toThrow(
        PermissionFormatError
      )
    })
  })

  test('non-string type injection', () => {
    const maliciousInputs = [
      [42],
      [true],
      [null],
      [undefined],
      [{}],
      [[]],
      [Symbol('permission')],
      [BigInt(123)],
      [new Date()],
      [/regex/],
      [new Error('evil')],
      [Promise.resolve('printer:view')],
      [
        function () {
          return 'printer:view'
        }
      ],
      [new Map()],
      [new Set()],
      [new WeakMap()],
      [new WeakSet()],
      [new Uint8Array([65, 66, 67])],
      [new ArrayBuffer(8)],
      [new SharedArrayBuffer(8)],
      [new Proxy({}, {})],
      [Object.create(null)]
    ]

    maliciousInputs.forEach((input) => {
      expect(() => manager.grantPermissions(input)).toThrow(
        PermissionFormatError
      )
    })
  })
})
