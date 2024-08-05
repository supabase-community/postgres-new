import { PGlite, PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { mkdir, readFile, access, rm } from 'node:fs/promises'
import net from 'node:net'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { extract } from 'tar'
import { hashMd5Password, PostgresConnection, TlsOptions } from 'pg-gateway'
import { env } from './env.js'
import path from 'node:path'
import { deleteCache } from './delete-cache.js'

const dumpDir = path.join(env.S3FS_MOUNT, 'dbs')
const tlsDir = path.join(env.S3FS_MOUNT, 'tls')

await mkdir(dumpDir, { recursive: true })
await mkdir(env.DATABASES_PATH, { recursive: true })
await mkdir(tlsDir, { recursive: true })

const tls: TlsOptions = {
  key: await readFile(path.join(tlsDir, 'key.pem')),
  cert: await readFile(path.join(tlsDir, 'cert.pem')),
}

function getIdFromServerName(serverName: string) {
  // The left-most subdomain contains the ID
  // ie. 12345.db.example.com -> 12345
  const [id] = serverName.split('.')
  return id
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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

      if (!tlsInfo.sniServerName.endsWith(env.WILDCARD_DOMAIN)) {
        connection.sendError({
          severity: 'FATAL',
          code: '08000',
          message: `unknown server ${tlsInfo.sniServerName}`,
        })
        connection.socket.end()
        return
      }

      try {
        await deleteCache()
      } catch (err) {
        console.error(`Error deleting cache: ${err}`)
      }

      const databaseId = getIdFromServerName(tlsInfo.sniServerName)

      console.log(`Serving database '${databaseId}'`)

      const dbPath = path.join(env.DATABASES_PATH, databaseId);

      if (!(await fileExists(dbPath))) {
        console.log(`Database '${databaseId}' is not cached, downloading...`)

        const dumpPath = path.join(dumpDir, `${databaseId}.tar.gz`);

        if (!(await fileExists(dumpPath))) {
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

        try {
          // Extract the .tar.gz file
          await pipeline(
            createReadStream(dumpPath),
            createGunzip(),
            extract({ cwd: dbPath })
          );
        } catch (error) {
          console.error(error);
          await rm(dbPath, { recursive: true, force: true }); // Clean up the partially created directory
          connection.sendError({
            severity: 'FATAL',
            code: 'XX000',
            message: `Error extracting database: ${(error as Error).message}`,
          });
          connection.socket.end();
          return;
        }
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