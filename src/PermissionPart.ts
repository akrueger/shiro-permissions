import { PermissionFormatError } from 'src/PermissionFormatError'
import { IPermissionPart } from 'src/types'

export class PermissionPart implements IPermissionPart {
  #subsets: Set<string>
  private static readonly VALID_CHARS = /^[a-zA-Z0-9_-]+$/ // Note: no * in regular chars

  constructor(part: string) {
    this.#subsets = this.#parseSubsets(part)
  }

  #parseSubsets(part: string): Set<string> {
    const subsets = new Set<string>()
    const parts = part
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (parts.length === 0) {
      throw new PermissionFormatError('Empty permission part')
    }

    // If it's just a wildcard, that's valid
    if (parts.length === 1 && parts[0] === '*') {
      subsets.add('*')
      return subsets
    }

    // Otherwise, no wildcards allowed in any parts
    for (const subset of parts) {
      if (subset === '*') {
        throw new PermissionFormatError(
          'Wildcard cannot be used as part of a subset list'
        )
      }
      if (!subset.match(PermissionPart.VALID_CHARS)) {
        throw new PermissionFormatError(
          `Invalid characters in subset "${subset}"`
        )
      }
      subsets.add(subset)
    }

    return subsets
  }

  containsAll(other: IPermissionPart): boolean {
    if (this.hasWildcard()) {
      return true
    }

    const otherSubsets = other.toString().split(',')
    return otherSubsets.every((subset) => this.#subsets.has(subset))
  }

  hasWildcard(): boolean {
    return this.#subsets.has('*')
  }

  toString(): string {
    return Array.from(this.#subsets).sort().join(',')
  }
}
