import { PGlite, PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { mkdir, readFile } from 'node:fs/promises'
import net from 'node:net'
import fs from 'node:fs'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { extract } from 'tar'
import { hashMd5Password, PostgresConnection, TlsOptions } from 'pg-gateway'

const dataMount = process.env.DATA_MOUNT ?? './data'
const s3fsMount = process.env.S3FS_MOUNT ?? './s3'
const wildcardDomain = process.env.WILDCARD_DOMAIN ?? 'db.example.com'

const dumpDir = `${s3fsMount}/dbs`
const tlsDir = `${s3fsMount}/tls`
const dbDir = `${dataMount}/dbs`

await mkdir(dumpDir, { recursive: true })
await mkdir(dbDir, { recursive: true })
await mkdir(tlsDir, { recursive: true })

const tls: TlsOptions = {
  key: await readFile(`${tlsDir}/key.pem`),
  cert: await readFile(`${tlsDir}/cert.pem`),
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

      if (!tlsInfo.sniServerName.endsWith(wildcardDomain)) {
        connection.sendError({
          severity: 'FATAL',
          code: '08000',
          message: `unknown server ${tlsInfo.sniServerName}`,
        })
        connection.socket.end()
        return
      }

      const databaseId = getIdFromServerName(tlsInfo.sniServerName)

      console.log(`Serving database '${databaseId}'`)

      const dbPath = `${dbDir}/${databaseId}`;

      if (!fs.existsSync(dbPath)) {
        console.log(`Database '${databaseId}' is not cached, downloading...`)

        const dumpPath = `${dumpDir}/${databaseId}.tar.gz`;

        if (!fs.existsSync(dumpPath)) {
          connection.sendError({
            severity: 'FATAL',
            code: 'XX000',
            message: `database ${databaseId} not found`,
          })
          connection.socket.end()
          return
        }

        // Create a directory for the database
        await mkdir(dbPath, { recursive: true });

        // Extract the .tar.gz file
        await pipeline(
          createReadStream(dumpPath),
          createGunzip(),
          extract({ cwd: dbPath,  })
        );
      }

      db = new PGlite(dbPath, {
        extensions: {
          vector,
        },
      })
    },
    async onStartup() {
      if (!db) {
        console.log('PGlite instance undefined. Was onTlsUpgrade never called?')
        connection.sendError({
          severity: 'FATAL',
          code: 'XX000',
          message: `error loading database`,
        })
        connection.socket.end()
        return true
      }

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

  socket.on('end', async () => {
    console.log('Client disconnected')
    await db?.close()
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})