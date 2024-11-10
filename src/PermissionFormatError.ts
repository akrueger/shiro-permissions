export class PermissionFormatError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PermissionFormatError'
    Object.setPrototypeOf(this, PermissionFormatError.prototype)
  }
}
