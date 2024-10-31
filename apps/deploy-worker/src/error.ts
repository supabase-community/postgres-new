export class DeployError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

export class IntegrationRevokedError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      'Your Supabase integration has been revoked. Please retry to restore your integration.',
      options
    )
    this.name = 'IntegrationRevokedError'
  }
}
