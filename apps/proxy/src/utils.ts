export function getDatabaseIdFromHostname(hostname: string) {
  const [databaseId] = hostname.split('.')
  return databaseId
}
