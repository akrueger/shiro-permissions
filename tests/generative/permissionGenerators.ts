import fc from 'fast-check'
import { Constants } from '../../src/types'

// Generator for valid part characters
const validPartChar = fc
  .integer({ min: 0, max: 0xffff })
  .map((n) => String.fromCharCode(n))
  .filter((c) => /[a-zA-Z0-9_-]/.test(c))

// Generator for valid permission part strings (non-wildcard)
const validPartString = fc
  .array(validPartChar, {
    minLength: 1,
    maxLength: Constants.MAX_PART_LENGTH - 2 // Leave room for possible subpart separator
  })
  .map((chars) => chars.join(''))

// Generator for wildcard parts
const wildcardPart = fc.constant('*')

// Generator for a valid permission part with possible subparts
const validPart = fc.oneof(
  wildcardPart,
  fc
    .array(validPartString, { minLength: 1, maxLength: 3 })
    .map((parts) => parts.join(','))
)

// Generator for valid permission strings
export const validPermissionArbitrary = fc
  .tuple(
    validPart, // First part
    validPart, // Optional second part
    validPart, // Optional third part
    fc.integer({ min: 1, max: 3 }) // Number of parts to use
  )
  .map(([p1, p2, p3, numParts]) => {
    const parts = [p1, p2, p3].slice(0, numParts)
    return parts.join(':')
  })
  .filter((p) => p !== '*') // Explicitly exclude single wildcard

// Generator for invalid permission strings
export const invalidPermissionArbitrary = fc.oneof(
  // Single characters/digits (invalid)
  fc.constant('0'),
  fc.constant('-'),
  fc.constant('A'),

  // Single wildcard (invalid)
  fc.constant('*'),

  // Too many parts
  fc
    .array(validPart, {
      minLength: Constants.MAX_PARTS + 1,
      maxLength: Constants.MAX_PARTS + 5
    })
    .map((parts) => parts.join(':')),

  // Invalid characters
  fc
    .array(fc.unicode())
    .map((chars) => chars.join(''))
    .filter((s) => /[^a-zA-Z0-9_,*:-]/.test(s)),

  // Empty parts
  fc
    .array(fc.constant(''), { minLength: 2, maxLength: 5 })
    .map((parts) => parts.join(':')),

  // Leading/trailing colons
  fc.array(validPartChar).map((chars) => ':' + chars.join('')),
  fc.array(validPartChar).map((chars) => chars.join('') + ':'),

  // Double colons
  fc.constant('a::b')
)

// Generator for permission pairs
export const permissionPairArbitrary = fc
  .tuple(validPart, validPartString)
  .chain(([action, instance]) => {
    const specific = `${action}:${instance}`
    const general = `${action}:*`
    return fc.tuple(fc.constant(specific), fc.constant(general))
  })

// Generator for permission sets
export const permissionSetArbitrary = fc
  .array(validPermissionArbitrary, {
    minLength: 1,
    maxLength: 5 // Keep sets reasonably sized
  })
  .map((perms) => new Set(perms))

// Generator for hierarchical permissions
export const hierarchicalPermissionArbitrary = fc
  .tuple(validPartString, validPartString, validPartString)
  .map(([domain, action, instance]) => ({
    full: `${domain}:*:*`,
    domainAction: `${domain}:${action}:*`,
    specific: `${domain}:${action}:${instance}`,
    unrelated: `other:${action}:${instance}`
  }))
