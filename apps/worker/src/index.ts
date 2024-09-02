import net from 'node:net'
import { PGlite, type PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { s3GetObject } from './s3-get-object.ts'
import { decompressArchive } from './decompress-archive.ts'
import path from 'node:path'
import { rm } from 'node:fs/promises'

const dataDir = path.join(process.cwd(), 'pgdata')

const server = net.createServer()

server.on('connection', async (socket) => {
  // the first message contains the databaseId
  const databaseId = await new Promise<string>((res) =>
    socket.once('data', (data) => res(data.toString('utf-8')))
  )

  let database: PGliteInterface | undefined

  // TODO: reuse MessageBuffer from pg-gateway to handle the data
  socket.on('data', async (data) => {
    try {
      if (!database) {
        console.time(`download pgdata for database ${databaseId}`)
        const response = await s3GetObject({
          bucket: process.env.AWS_S3_BUCKET!,
          endpoint: process.env.AWS_ENDPOINT_URL_S3!,
          region: process.env.AWS_REGION!,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          key: `dbs/${databaseId}.tar.gz`,
        })
        console.timeEnd(`download pgdata for database ${databaseId}`)

        console.time(`decompress pgdata for database ${databaseId}`)
        if (!response.body) {
          throw new Error('No body in response')
        }
        await decompressArchive(response.body, dataDir)
        console.timeEnd(`decompress pgdata for database ${databaseId}`)

        console.time(`init database ${databaseId}`)
        database = await PGlite.create({
          dataDir,
          extensions: {
            vector,
          },
        })
        console.timeEnd(`init database ${databaseId}`)
      }

      const response = await database.execProtocolRaw(data)
      socket.write(response)
    } catch (error) {
      console.error('data error', error)
      socket.destroy()
    }
  })

  socket.on('error', async (err) => {
    console.error('socket error', err)
    await database?.close()
    await rm(dataDir, { recursive: true, force: true }).catch(() => {})
    database = undefined
    console.log(`database ${databaseId} closed`)
  })

  socket.on('close', async () => {
    await database?.close()
    await rm(dataDir, { recursive: true, force: true }).catch(() => {})
    database = undefined
    console.log(`database ${databaseId} closed`)
  })

  // send ack to proxy that we are ready
  socket.write('ACK', 'utf-8')
})

server.listen(5432, () => {
  console.log('Server is running on port 5432')
})
