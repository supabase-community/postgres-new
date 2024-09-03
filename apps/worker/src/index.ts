import net from 'node:net'
import { PGlite, type PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { decompressArchive } from './decompress-archive.ts'
import path from 'node:path'
import { rm } from 'node:fs/promises'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getPgData } from './get-pgdata.ts'

const s3 = new S3Client({ forcePathStyle: true })

const dataDir = path.join(process.cwd(), 'pgdata')

const server = net.createServer()

server.on('connection', async (socket) => {
  let database: PGliteInterface | undefined

  socket.on('error', async (err) => {
    console.error('socket error', err)
    console.time(`close database`)
    await database?.close()
    database = undefined
    console.timeEnd(`close database`)
    console.time(`remove pgdata`)
    await rm(dataDir, { recursive: true, force: true }).catch(() => {})
    console.timeEnd(`remove pgdata`)
  })

  socket.on('close', async () => {
    console.error('socket closed')
    console.time(`close database`)
    await database?.close()
    database = undefined
    console.timeEnd(`close database`)
    console.time(`remove pgdata`)
    await rm(dataDir, { recursive: true, force: true }).catch(() => {})
    console.timeEnd(`remove pgdata`)
  })

  // the first message contains the databaseId
  console.time(`read databaseId`)
  const databaseId = await new Promise<string>((res) =>
    socket.once('data', (data) => res(data.toString('utf-8')))
  )
  console.timeEnd(`read databaseId`)

  // TODO: reuse MessageBuffer from pg-gateway to handle the data
  socket.on('data', async (data) => {
    try {
      if (!database) {
        console.time(`get pgdata for database ${databaseId}`)
        const pgData = await getPgData(databaseId)
        console.timeEnd(`get pgdata for database ${databaseId}`)

        console.time(`init database ${databaseId}`)
        database = await PGlite.create({
          dataDir: pgData,
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

  // send ack to proxy that we are ready
  console.time(`send ack to proxy`)
  socket.write('ACK', 'utf-8')
  console.timeEnd(`send ack to proxy`)
})

server.listen(5432, () => {
  console.log('Server is running on port 5432')
})
