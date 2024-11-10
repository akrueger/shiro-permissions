import { PermissionFormatError } from 'src/PermissionFormatError'
import { PermissionPart } from 'src/PermissionPart'
import { IShiroPermission } from 'src/types'

export class ShiroPermission implements IShiroPermission {
  private static readonly PART_DIVIDER = ':'
  private static readonly PERMISSION_PART_REGEX = /^[a-zA-Z0-9_,*-]+$/
  private static readonly MAX_PARTS = 10
  private static readonly MAX_PART_LENGTH = 50
  private static readonly WILDCARD = '*'

  readonly #parts: PermissionPart[]

  constructor(permission: string) {
    if (!permission || typeof permission !== 'string') {
      throw new PermissionFormatError('Permission must be a non-empty string')
    }

    const parts = permission.split(ShiroPermission.PART_DIVIDER)
    this.validateParts(parts)
    this.#parts = parts.map((part) => new PermissionPart(part))
  }

  private validateParts(parts: string[]): void {
    // Check basic part constraints
    if (parts.length === 0 || parts.length > ShiroPermission.MAX_PARTS) {
      throw new PermissionFormatError(
        `Permission must have between 1 and ${ShiroPermission.MAX_PARTS} parts`
      )
    }

    if (parts.some((part) => !part)) {
      throw new PermissionFormatError('Empty permission parts are not allowed')
    }

    // Single wildcard permission is not allowed
    if (parts.length === 1 && parts[0] === ShiroPermission.WILDCARD) {
      throw new PermissionFormatError(
        'Single wildcard permission is not allowed'
      )
    }

    parts.forEach((part, index) => {
      // Check length
      if (part.length > ShiroPermission.MAX_PART_LENGTH) {
        throw new PermissionFormatError(
          `Permission part exceeds maximum length of ${ShiroPermission.MAX_PART_LENGTH}`
        )
      }

      // Check characters
      if (!ShiroPermission.PERMISSION_PART_REGEX.test(part)) {
        throw new PermissionFormatError(
          `Invalid characters in permission part "${part}"`
        )
      }
    })
  }

  implies(other: IShiroPermission): boolean {
    if (!(other instanceof ShiroPermission)) {
      return false
    }

    // Parts length must match for implication
    if (this.#parts.length !== other.#parts.length) {
      return false
    }

    // Check each part
    return this.#parts.every((thisPart, index) =>
      thisPart.containsAll(other.#parts[index])
    )
  }
}
