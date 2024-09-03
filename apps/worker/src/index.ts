import net from 'node:net'
import { PGlite, type PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { getPgData } from './get-pgdata.ts'
import { MessageBuffer } from './message-buffer.ts'

const server = net.createServer()

server.on('connection', async (socket) => {
  let database: PGliteInterface | undefined

  const messageBuffer = new MessageBuffer()

  socket.on('error', async (err) => {
    console.error('socket error', err)
  })

  socket.on('close', async (hadError) => {
    console.log(`socket closed${hadError ? ' due to error' : ''}`)
    console.time('close database')
    await database?.close()
    database = undefined
    console.timeEnd('close database')
    // TODO: notify proxy that we are done
  })

  // the first message contains the databaseId
  console.time(`read databaseId`)
  const databaseId = await new Promise<string>((res) =>
    socket.once('data', (data) => res(data.toString('utf-8')))
  )
  console.timeEnd(`read databaseId`)

  socket.on('data', async (socketData) => {
    console.log('Received raw data:', socketData.toString('hex'))
    await messageBuffer.handleData(socketData, async (data) => {
      console.log('Processing buffered message:', data.toString('hex'))
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

        const response = Buffer.from(await database.execProtocolRaw(data))
        console.log('Sending response:', response.toString('hex'))
        socket.write(response)
      } catch (error) {
        console.error('Error processing message:', error)
        socket.destroy()
      }
    })
  })

  // send ack to proxy that we are ready
  console.time(`send ack to proxy`)
  socket.write('ACK', 'utf-8')
  console.timeEnd(`send ack to proxy`)
})

server.listen(5432, () => {
  console.log('Server is running on port 5432')
})
