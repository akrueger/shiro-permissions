import { Constants } from '../../src/types'

/**
 * Validates whether a permission string follows Shiro's permission format rules.
 *
 * Rules enforced:
 * 1. Must be a non-empty string
 * 2. Must have between 1 and 10 parts (delimited by colons)
 * 3. No empty parts allowed
 * 4. Each part must only contain valid characters: a-z, A-Z, 0-9, _, -, comma, *
 * 5. Each part must not exceed 50 characters
 * 6. Single wildcard (*) permission not allowed
 * 7. Wildcard can only be used alone in a part or not at all (no mixing with other chars)
 * 8. No leading/trailing colons or commas
 * 9. No consecutive colons or commas
 *
 * @param permission The permission string to validate
 * @returns boolean indicating if the permission string is valid
 */
export const isValidPermission = (permission: string): boolean => {
  // Check for empty or non-string input
  if (!permission || typeof permission !== 'string') {
    return false
  }

  // Check for leading/trailing colons
  if (permission.startsWith(':') || permission.endsWith(':')) {
    return false
  }

  // Check for consecutive colons
  if (permission.includes('::')) {
    return false
  }

  // Split into parts
  const parts = permission.split(':')

  // Check number of parts (1-10)
  if (parts.length === 0 || parts.length > Constants.MAX_PARTS) {
    return false
  }

  // Single wildcard permission is not allowed
  if (parts.length === 1 && parts[0] === '*') {
    return false
  }

  // Validate each part
  for (const part of parts) {
    // Check for empty parts
    if (!part || part.trim().length === 0) {
      return false
    }

    // Check part length
    if (part.length > Constants.MAX_PART_LENGTH) {
      return false
    }

    // Check for leading/trailing commas
    if (part.startsWith(',') || part.endsWith(',')) {
      return false
    }

    // Check for consecutive commas
    if (part.includes(',,')) {
      return false
    }

    // Split subparts
    const subparts = part.split(',')

    // Validate each subpart
    for (const subpart of subparts) {
      // Check for empty subparts
      if (!subpart || subpart.trim().length === 0) {
        return false
      }

      // If one subpart is wildcard, it must be the only subpart
      if (subpart === '*' && subparts.length > 1) {
        return false
      }

      // Check for valid characters
      // If it's not a wildcard, it must match the valid characters regex
      if (subpart !== '*' && !Constants.VALID_CHARS.test(subpart)) {
        return false
      }

      // Wildcards can't be combined with other characters
      if (subpart.includes('*') && subpart !== '*') {
        return false
      }
    }
  }

  return true
}

/**
 * Tests if two permission strings follow Shiro's rules for valid permissions.
 * Useful for property-based testing.
 *
 * @param permission1 First permission string
 * @param permission2 Second permission string
 * @returns True if both permissions are valid and comparable
 */
export const arePermissionsComparable = (
  permission1: string,
  permission2: string
): boolean => {
  // Both must be valid permissions
  if (!isValidPermission(permission1) || !isValidPermission(permission2)) {
    return false
  }

  const parts1 = permission1.split(':')
  const parts2 = permission2.split(':')

  // Must have same number of parts to be comparable
  return parts1.length === parts2.length
}
