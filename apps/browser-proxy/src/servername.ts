const WILDCARD_DOMAIN = process.env.WILDCARD_DOMAIN ?? 'browser.db.build'

// Escape any dots in the domain since dots are special characters in regex
const escapedDomain = WILDCARD_DOMAIN.replace(/\./g, '\\.')

// Create the regex pattern dynamically
const regexPattern = new RegExp(`^([^.]+)\\.${escapedDomain}$`)

export function extractDatabaseId(servername: string): string {
  const match = servername.match(regexPattern)
  return match![1]
}

export function isValidServername(servername: string): boolean {
  return regexPattern.test(servername)
}
