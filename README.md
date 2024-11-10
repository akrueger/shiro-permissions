# Shiro Permissions

A TypeScript implementation of Apache Shiro's permission system, providing a robust and type-safe way to handle wildcard permissions and access control.

[![npm version](https://img.shields.io/npm/v/shiro-permissions.svg)](https://www.npmjs.com/package/shiro-permissions)
[![Build Status](https://github.com/akrueger/shiro-permissions/workflows/CI/badge.svg)](https://github.com/akrueger/shiro-permissions/actions)
[![Coverage Status](https://coveralls.io/repos/github/akrueger/shiro-permissions/badge.svg?branch=main)](https://coveralls.io/github/akrueger/shiro-permissions?branch=main)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Apache Shiro Compatibility](#apache-shiro-compatibility)
- [Permission Syntax](#permission-syntax)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Performance](#performance)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install shiro-permissions
# or
yarn add shiro-permissions
# or
pnpm add shiro-permissions
```

## Quick Start

```typescript
import { ShiroPermissionManager } from 'shiro-permissions';

const manager = new ShiroPermissionManager();

// Grant permissions
manager.grantPermissions([
  'printer:print:*',
  'scanner:scan,query',
  'document:read,write:123'
]);

// Check permissions
console.log(manager.isPermitted('printer:print:hp1')); // true
console.log(manager.isPermitted('scanner:scan')); // true
console.log(manager.isPermitted('document:read:123')); // true
console.log(manager.isPermitted('printer:configure')); // false
```

## Apache Shiro Compatibility

This implementation strictly follows Apache Shiro's permission rules:

### Wildcard Rules
- Wildcards (`*`) are only allowed at the last position of each part
- Single wildcard permissions (`*`) are not allowed
- Multiple wildcards in the same permission are not allowed
- A wildcard implies all values at its position only

```typescript
// Valid wildcard usage
manager.grantPermissions([
  'printer:print:*',    // Matches any instance for printer:print
  'user:*',            // Matches any action for user
  'document:read:*'    // Matches any instance for document:read
]);

// Invalid wildcard usage - these will throw
manager.grantPermissions([
  '*',                 // Single wildcard not allowed
  '*:view',           // Wildcard in first position not allowed
  'printer:*:admin',  // Wildcard must be in last position
  'user:*:*'         // Multiple wildcards not allowed
]);
```

### Part Matching
- Exact number of parts must match
- Parts are case-sensitive
- Empty parts are not allowed

```typescript
manager.grantPermissions(['user:view:1']);

manager.isPermitted('user:view:1');     // true
manager.isPermitted('user:view');       // false (wrong number of parts)
manager.isPermitted('User:View:1');     // false (case sensitive)
manager.isPermitted('user:view:1:sub'); // false (too many parts)
```

### Subpart Permissions
- Subparts are separated by commas
- Each subpart is matched individually
- Subparts cannot contain wildcards

```typescript
manager.grantPermissions(['document:read,write,delete:123']);

manager.isPermitted('document:read:123');   // true
manager.isPermitted('document:write:123');  // true
manager.isPermitted('document:delete:123'); // true
manager.isPermitted('document:print:123');  // false
```

## Permission Syntax

Permissions follow the pattern: `resource:action:instance`

```typescript
// Basic permission
'printer:print'

// Multiple actions
'printer:print,query,manage'

// Instance-specific permission
'document:read:123'

// Wildcard permission
'printer:print:*'

// Complex permission
'system:user:create,delete:*'
```

### Validation Rules
- Parts can only contain: `a-z`, `A-Z`, `0-9`, `_`, `-`, `,` (for subparts), `*` (wildcard)
- Maximum 10 parts per permission
- Maximum 50 characters per part
- No empty parts allowed
- No spaces allowed
- Unicode characters are not allowed

## Advanced Usage

### Multiple Permission Levels

```typescript
const manager = new ShiroPermissionManager();

manager.grantPermissions([
  'system:admin:*',          // Admin can do anything
  'system:user:view,edit',   // User can view and edit
  'system:guest:view'        // Guest can only view
]);

// Check permissions at different levels
console.log(manager.isPermitted('system:admin:configure')); // true
console.log(manager.isPermitted('system:user:edit'));      // true
console.log(manager.isPermitted('system:guest:view'));     // true
console.log(manager.isPermitted('system:guest:edit'));     // false
```

### Complex Permission Hierarchies

```typescript
const manager = new ShiroPermissionManager();

manager.grantPermissions([
  'document:*:public',              // All actions on public documents
  'document:read,write:private',    // Read/write private documents
  'document:read:confidential'      // Only read confidential documents
]);

// Check different document types
console.log(manager.isPermitted('document:delete:public'));      // true
console.log(manager.isPermitted('document:write:private'));      // true
console.log(manager.isPermitted('document:write:confidential')); // false
```

# Permission Implications in Shiro

## Overview
The Shiro permission system uses a sophisticated implication system that determines when one permission implies another. Understanding these implications is crucial for properly implementing access control.

## Permission Structure
Permissions have three main components:
1. Parts (separated by colons)
2. Subparts (separated by commas within parts)
3. Wildcards (represent "any value" at a specific level)

## Basic Rules

### 1. Part Matching
- Parts must match exactly in number
- Each part must either match exactly or be implied by a wildcard
```typescript
'printer:print'        // Implies only printer:print
'printer:print:1'      // Implies only printer:print:1
'printer:*'           // Implies printer:anything
'printer:print:*'     // Implies printer:print:anything
```

### 2. Subpart Behavior
- Subparts are discrete permissions
- Having one subpart does not imply having others
- Order of subparts doesn't matter
```typescript
'printer:print,scan'   // Implies both printer:print and printer:scan
'document:read,write'  // Does NOT imply document:delete
```

### 3. Wildcard Rules
- A wildcard implies any value at its position
- Wildcards can appear at any part level
- Wildcards cannot be combined with other subparts in the same position
```typescript
'*:view:public'       // Any resource, but only view:public
'printer:*:1'         // Any action on printer:1
'printer:print:*'     // Print to any instance
```

## Advanced Implications

### Multiple Level Implications
```typescript
// Given permission: 'system:admin:users:*'
isPermitted('system:admin:users:create')  // true
isPermitted('system:admin:users:delete')  // true
isPermitted('system:admin:other:create')  // false
```

### Subpart Combinations
```typescript
// Given permission: 'document:read,write:public,private'
isPermitted('document:read:public')    // true
isPermitted('document:write:private')  // true
isPermitted('document:read:secret')    // false
```

### Wildcard Interactions
```typescript
// Multiple permissions:
// - 'printer:*:public'
// - 'printer:print:*'
isPermitted('printer:scan:public')     // true (matched by first)
isPermitted('printer:print:private')   // true (matched by second)
isPermitted('printer:scan:private')    // false (not matched by either)
```

## Common Patterns

### Role-Based Permissions
```typescript
// Admin role
'system:*'                    // All system permissions
// Manager role
'department:*:view,edit'      // View/edit all departments
// User role
'document:read,write:owned'   // Read/write own documents
```

### Resource-Based Permissions
```typescript
// Public access
'document:read:public'
// Internal access
'document:read,write:internal,public'
// Admin access
'document:*:*'
```

### Instance-Level Permissions
```typescript
// Specific instance
'printer:print:hp-1'
// Group of instances
'printer:print:hp-*'
// All instances
'printer:print:*'
```

## Edge Cases and Gotchas

1. **Case Sensitivity**
   - Permissions are case-sensitive by default
   - 'Document:Read' ≠ 'document:read'

2. **Empty Parts**
   - Empty parts are not allowed
   - 'printer::print' is invalid
   - ':printer:print' is invalid

3. **Wildcard Limitations**
   - Cannot combine wildcard with other subparts
   - 'printer:*,print' is invalid

4. **Part Count Matching**
   - 'printer:print' does not imply 'printer:print:1'
   - 'printer:print:*' does not imply 'printer:print'

## Performance Considerations

1. **Caching**
   - Permission checks are cached for performance
   - Cache is invalidated when permissions change

2. **Evaluation Order**
   - More specific permissions are checked before wildcards
   - Direct matches are checked before implied matches

3. **Memory Usage**
   - Large numbers of subparts can impact memory usage
   - Consider grouping permissions logically to reduce combinations

## API Reference

### ShiroPermissionManager

```typescript
class ShiroPermissionManager {
  /**
   * Create a new permission manager
   */
  constructor()

  /**
   * Grant one or more permissions
   * @param permissions Array of permission strings
   * @throws PermissionFormatError if any permission string is invalid
   */
  grantPermissions(permissions: string[]): void

  /**
   * Check if a permission is granted
   * @param permission Permission string to check
   * @returns boolean indicating if the permission is granted
   */
  isPermitted(permission: string): boolean

  /**
   * Clear all granted permissions
   */
  clear(): void
}
```

## Performance

The implementation includes several performance optimizations:

- Efficient permission parsing and validation
- Built-in permission caching
- Optimized wildcard matching
- Fast subpart comparisons

Cache behavior:
- Cache size limit: 10,000 entries
- Automatic cache invalidation on permission changes
- LRU-style cache cleanup

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

To get started:

```bash
# Clone the repository
git clone https://github.com/akrueger/shiro-permissions.git

# Install dependencies
npm install

# Run tests
npm test

# Run TypeScript type checking
npm run type-check

# Build the library
npm run build
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
