import { PGlite, PGliteInterface } from '@electric-sql/pglite'
import { mkdir, readFile } from 'node:fs/promises'
import net from 'node:net'
import { PostgresConnection, TlsOptionsCallback, hashMd5Password } from 'pg-gateway'

const tls: TlsOptionsCallback = async ({ sniServerName }) => {
  // Optionally serve different certs based on `sniServerName`
  // In this example we'll use a single wildcard cert for all servers (ie. *.db.example.com)
  return {
    key: await readFile('server-key.pem'),
    cert: await readFile('server-cert.pem'),
    ca: await readFile('ca-cert.pem'),
  }
}

function getIdFromServerName(serverName: string) {
  // The left-most subdomain contains the ID
  // ie. 12345.db.example.com -> 12345
  const [id] = serverName.split('.')
  return id
}

const server = net.createServer((socket) => {
  let db: PGliteInterface

  const connection = new PostgresConnection(socket, {
    serverVersion: '16.3 (PGlite 0.2.0)',
    authMode: 'md5Password',
    tls,
    async validateCredentials(credentials) {
      if (credentials.authMode === 'md5Password') {
        const { hash, salt } = credentials
        const expectedHash = await hashMd5Password('postgres', 'postgres', salt)
        return hash === expectedHash
      }
      return false
    },
    async onTlsUpgrade({ tlsInfo }) {
      if (!tlsInfo) {
        connection.sendError({
          severity: 'FATAL',
          code: '08000',
          message: `ssl connection required`,
        })
        connection.socket.end()
        return
      }

      if (!tlsInfo.sniServerName) {
        connection.sendError({
          severity: 'FATAL',
          code: '08000',
          message: `ssl sni extension required`,
        })
        connection.socket.end()
        return
      }

      const databaseId = getIdFromServerName(tlsInfo.sniServerName)

      db = new PGlite(`./dbs/${databaseId}`)
    },
    async onStartup() {
      // Wait for PGlite to be ready before further processing
      await db.waitReady
      return false
    },
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        return false
      }

      // Forward raw message to PGlite
      try {
        const responseData = await db.execProtocolRaw(data)
        connection.sendData(responseData)
      } catch (err) {
        console.error(err)
      }
      return true
    },
  })

  socket.on('end', () => {
    console.log('Client disconnected')
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')

  await mkdir('./dbs', { recursive: true })
})
