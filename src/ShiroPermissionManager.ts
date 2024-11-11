import { PermissionFormatError } from 'src/PermissionFormatError'
import { Constants } from 'src/types'

export class ShiroPermissionManager {
  private root: PermissionNode = new PermissionNode()
  private cache: Map<string, boolean> = new Map()
  private static readonly CACHE_MAX_SIZE = 10_000
  private readonly caseSensitive: boolean

  constructor(options: { caseSensitive?: boolean } = {}) {
    this.caseSensitive = options.caseSensitive ?? false
  }

  private normalizePermission(permission: string): string {
    return this.caseSensitive ? permission : permission.toLowerCase()
  }

  private validateParts(parts: string[]): void {
    if (parts.length === 0) {
      throw new PermissionFormatError('Empty permission string not allowed')
    }

    if (parts.length === 1 && parts[0] === '*') {
      throw new PermissionFormatError('Single wildcard permission not allowed')
    }

    if (parts.length > Constants.MAX_PARTS) {
      throw new PermissionFormatError('Too many permission parts')
    }

    const PERMISSION_PART_REGEX = /^[a-zA-Z0-9_,*-]+$/
    const STRICT_SUBPART_REGEX = /^[a-zA-Z0-9_-]+$/

    parts.forEach((part) => {
      if (!part) {
        throw new PermissionFormatError(
          'Empty permission parts are not allowed'
        )
      }

      if (part.length > Constants.MAX_PART_LENGTH) {
        throw new PermissionFormatError(
          'Permission part exceeds maximum length'
        )
      }

      if (!PERMISSION_PART_REGEX.test(part)) {
        throw new PermissionFormatError(
          `Invalid characters in permission part "${part}"`
        )
      }

      const subparts = part.split(',')

      if (subparts.some((s) => !s)) {
        throw new PermissionFormatError('Empty subparts are not allowed')
      }

      if (subparts.some((s) => s === '*')) {
        if (subparts.length > 1) {
          throw new PermissionFormatError(
            'Wildcard cannot be mixed with other subparts'
          )
        }
        if (part !== '*') {
          throw new PermissionFormatError(
            'Wildcard must be standalone, not part of another string'
          )
        }
      } else {
        subparts.forEach((subpart) => {
          if (!STRICT_SUBPART_REGEX.test(subpart)) {
            throw new PermissionFormatError(
              `Invalid characters in subpart "${subpart}"`
            )
          }
        })
      }
    })
  }

  grantPermissions(permissions: string[]): void {
    if (!Array.isArray(permissions)) {
      throw new PermissionFormatError(
        'Permissions must be provided as an array'
      )
    }

    for (const permission of permissions) {
      if (typeof permission !== 'string') {
        throw new PermissionFormatError('All permissions must be strings')
      }

      const normalizedPermission = this.normalizePermission(permission)
      const parts = normalizedPermission.split(':')
      this.validateParts(parts)

      // Add to permission tree
      this.root.addSubpath(parts)
    }

    // Clear cache on any permission changes
    this.cache.clear()
  }

  isPermitted(permission: string): boolean {
    const normalizedPermission = this.normalizePermission(permission)
    const cachedResult = this.cache.get(normalizedPermission)
    if (cachedResult !== undefined) {
      return cachedResult
    }

    try {
      const parts = normalizedPermission.split(':')
      this.validateParts(parts)
      const result = this.root.implies(parts, 0, parts.length)

      if (this.cache.size < ShiroPermissionManager.CACHE_MAX_SIZE) {
        this.cache.set(normalizedPermission, result)
      }

      return result
    } catch (error) {
      if (error instanceof PermissionFormatError) {
        throw error
      }
      throw new PermissionFormatError(
        `Invalid permission check "${permission}"`,
        { cause: error instanceof Error ? error : undefined }
      )
    }
  }

  clear(): void {
    this.root = new PermissionNode()
    this.cache.clear()
  }
}

class PermissionNode {
  children: Map<string, PermissionNode> = new Map()
  subparts: Set<string> = new Set()
  hasWildcard: boolean = false
  requestedLength: number = 0

  addSubpath(parts: string[], index: number = 0): void {
    if (index >= parts.length) {
      return
    }

    this.requestedLength = Math.max(this.requestedLength, parts.length)
    const part = parts[index]
    const subparts = part.split(',')

    if (subparts.includes('*')) {
      this.hasWildcard = true
      if (index < parts.length - 1) {
        let wildcardNode = this.children.get('*')
        if (!wildcardNode) {
          wildcardNode = new PermissionNode()
          this.children.set('*', wildcardNode)
        }
        wildcardNode.addSubpath(parts, index + 1)
      }
    } else {
      subparts.forEach((subpart) => {
        this.subparts.add(subpart)
        if (index < parts.length - 1) {
          let childNode = this.children.get(subpart)
          if (!childNode) {
            childNode = new PermissionNode()
            this.children.set(subpart, childNode)
          }
          childNode.addSubpath(parts, index + 1)
        }
      })
    }
  }

  implies(
    parts: string[],
    index: number = 0,
    requestedLength: number
  ): boolean {
    // Parts length must match exactly what was granted
    if (requestedLength !== this.requestedLength) {
      return false
    }

    // If we've processed all parts, we're done
    if (index >= parts.length) {
      return true
    }

    const part = parts[index]
    const requestedSubparts = part.split(',')

    // For wildcard nodes
    if (this.hasWildcard) {
      const wildcardChild = this.children.get('*')
      return wildcardChild?.implies(parts, index + 1, requestedLength) ?? true
    }

    // When checking permissions, each requested subpart must be granted
    for (const subpart of requestedSubparts) {
      if (!this.subparts.has(subpart)) {
        return false
      }
    }

    // If this is the last part, we're done
    if (index === parts.length - 1) {
      return true
    }

    // For checking child nodes, we only need to find one path that satisfies the permission
    for (const subpart of requestedSubparts) {
      const child = this.children.get(subpart)
      if (child?.implies(parts, index + 1, requestedLength)) {
        return true
      }
    }

    return false
  }
}