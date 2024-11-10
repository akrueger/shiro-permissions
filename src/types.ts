export type ValidPermissionPart =
  | `${string}:${string}`
  | `${string}:${string}:${string}`

export interface IPermissionPart {
  containsAll(other: IPermissionPart): boolean
  toString(): string
  hasWildcard(): boolean
}

export interface IShiroPermission {
  implies(other: IShiroPermission): boolean
}

const CONSTANTS = {
  MAX_PARTS: 3,
  MAX_PART_LENGTH: 50,
  WILDCARD: '*',
  PART_SEPARATOR: ':',
  SUBSET_SEPARATOR: ',',
  VALID_CHARS: /^[a-zA-Z0-9_,*-]+$/
} satisfies Record<string, number | string | RegExp>

export const Constants = Object.freeze(CONSTANTS)
