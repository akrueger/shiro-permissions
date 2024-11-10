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
    // Single part permissions not allowed
    if (
      parts.length === 0 ||
      parts.length > Constants.MAX_PARTS ||
      parts.length === 1
    ) {
      throw new PermissionFormatError('Permission must have 2 or 3 parts')
    }

    // No empty parts
    if (parts.some((part) => !part)) {
      throw new PermissionFormatError('Empty permission parts are not allowed')
    }

    // Single wildcard not allowed
    if (parts.length === 1 && parts[0] === '*') {
      throw new PermissionFormatError(
        'Single wildcard permission is not allowed'
      )
    }

    // Validate each part
    const PERMISSION_PART_REGEX = /^[a-zA-Z0-9_,*-]+$/
    parts.forEach((part) => {
      // Length check before any splitting
      if (part.length > Constants.MAX_PART_LENGTH) {
        throw new PermissionFormatError(
          'Permission part exceeds maximum length of 50'
        )
      }

      // Check for valid characters
      if (!PERMISSION_PART_REGEX.test(part)) {
        throw new PermissionFormatError(
          `Invalid characters in permission part "${part}"`
        )
      }

      // Validate subparts
      const subparts = part.split(',')
      if (subparts.some((s) => !s)) {
        throw new PermissionFormatError('Empty subparts are not allowed')
      }

      if (subparts.includes('*') && subparts.length > 1) {
        throw new PermissionFormatError(
          'Wildcard cannot be mixed with other subparts'
        )
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
      const result = this.root.implies(parts)

      // Cache the result if space available
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
        {
          cause: error instanceof Error ? error : undefined
        }
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
  isWildcard: boolean = false
  isTerminal: boolean = false
  subparts: Set<string> = new Set()

  addSubpath(parts: string[], index: number = 0): void {
    if (index >= parts.length) {
      this.isTerminal = true
      return
    }

    const part = parts[index].toLowerCase()
    const subparts = part.split(',')

    // Handle wildcards
    if (subparts.includes('*')) {
      this.isWildcard = true
      this.subparts.clear()
      this.subparts.add('*')
    } else {
      subparts.forEach((subpart) => this.subparts.add(subpart.toLowerCase()))
    }

    // Mark terminal nodes
    if (index === parts.length - 1) {
      this.isTerminal = true
    }

    // Create child nodes
    if (index < parts.length - 1) {
      subparts.forEach((subpart) => {
        if (!this.children.has(subpart)) {
          this.children.set(subpart, new PermissionNode())
        }
        this.children.get(subpart)!.addSubpath(parts, index + 1)
      })
    }
  }

  implies(parts: string[], index: number = 0): boolean {
    // Base case: we've processed all parts
    if (index >= parts.length) {
      return this.isTerminal
    }

    // Parts length must match exactly (key Shiro requirement)
    if (parts.length !== index + 1 && !this.children.size) {
      return false
    }

    const part = parts[index].toLowerCase()
    const requestedSubparts = part.split(',')

    // Wildcard implies everything at this level
    if (this.isWildcard) {
      if (index === parts.length - 1) {
        return true
      }
      // Must have children to imply next level
      const child = this.children.values().next().value
      return child ? child.implies(parts, index + 1) : false
    }

    // For non-wildcards, check if all requested subparts are contained in our subparts
    // This matches Shiro's WildcardPermission behavior where each requested
    // subpart must be implied by the granted permission
    for (const requestedSubpart of requestedSubparts) {
      const normalized = requestedSubpart.toLowerCase()
      if (!this.subparts.has(normalized)) {
        return false
      }
    }

    // If we're at the final part and all subparts match, we're done
    if (index === parts.length - 1) {
      return true
    }

    // For non-terminal parts, at least one child must imply the remaining parts
    for (const subpart of requestedSubparts) {
      const child = this.children.get(subpart.toLowerCase())
      if (child && child.implies(parts, index + 1)) {
        return true
      }
    }

    return false
  }
}
