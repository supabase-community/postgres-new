import net from 'node:net'
import { PGlite, type PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
// import { PostgresConnection } from 'pg-gateway'
import { s3GetObject } from './s3-get-object.ts'

const server = net.createServer()

server.on('connection', async (socket) => {
  console.log('new connection')
  // the first message contains the databaseId
  const databaseId = await new Promise<string>((res) =>
    socket.once('data', (data) => res(data.toString('utf-8')))
  )

  console.log('databaseId', databaseId)

  let database: PGliteInterface | undefined

  // const connection = new PostgresConnection(socket, {
  //   async onMessage(data) {
  //     if (!database) {
  //       console.time('download pgdata')
  //       const response = await s3GetObject({
  //         bucket: process.env.AWS_S3_BUCKET!,
  //         endpoint: process.env.AWS_ENDPOINT_URL_S3!,
  //         region: process.env.AWS_REGION!,
  //         accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  //         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  //         key: `dbs/${databaseId}.tar.gz`,
  //       })
  //       const pgdata = new Blob([await response.arrayBuffer()], { type: 'application/gzip' })
  //       console.timeEnd('download tarball')

  //       console.time('init database')
  //       database = await PGlite.create({
  //         loadDataDir: pgdata,
  //         extensions: {
  //           vector,
  //         },
  //       })
  //       console.timeEnd('init database')
  //     }

  //     const response = await database.execProtocolRaw(data)
  //     connection.sendData(response)

  //     return true
  //   },
  // })

  // send ack to proxy

  socket.on('data', async (data) => {
    console.log('data:', data.toString('hex'))

    if (!database) {
      console.time('download pgdata')
      const response = await s3GetObject({
        bucket: process.env.AWS_S3_BUCKET!,
        endpoint: process.env.AWS_ENDPOINT_URL_S3!,
        region: process.env.AWS_REGION!,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        key: `dbs/${databaseId}.tar.gz`,
      })
      const pgdata = new Blob([await response.arrayBuffer()], { type: 'application/gzip' })
      console.timeEnd('download tarball')

      console.time('init database')
      database = await PGlite.create({
        loadDataDir: pgdata,
        extensions: {
          vector,
        },
      })
      console.timeEnd('init database')
    }

    const response = await database.execProtocolRaw(data)
    socket.write(response)
  })

  socket.on('close', async () => {
    await database?.close()
    database = undefined
  })

  console.log('sending ack to proxy')
  socket.write('ACK', 'utf-8')
})

server.listen(5432, () => {
  console.log('Server is running on port 5432')
})
