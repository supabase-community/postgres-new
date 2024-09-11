import { isIPv4 } from 'node:net'

export function extractIP(address: string): string {
  if (isIPv4(address)) {
    return address
  }

  // Check if it's an IPv4-mapped IPv6 address
  const ipv4 = address.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/)
  if (ipv4) {
    return ipv4[1]
  }

  // We assume it's an IPv6 address
  return address
}
