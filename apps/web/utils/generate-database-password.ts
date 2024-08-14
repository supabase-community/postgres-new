import { randomBytes } from 'node:crypto'

export function generateDatabasePassword(length: number = 32): string {
  // url safe characters
  const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(length)
  let password = ''

  for (let i = 0; i < length; i++) {
    password += validChars[bytes[i] % validChars.length]
  }

  return password
}
