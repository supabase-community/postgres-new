export class DeployError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}
