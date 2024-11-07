/**
 * Generate a random password with a length of 16 characters.
 */
export function generatePassword(): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const length = 16
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)

  return Array.from(randomValues)
    .map((value) => charset[value % charset.length])
    .join('')
}
