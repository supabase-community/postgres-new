import net from 'node:net'
import { PGlite, type PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { getPgData } from './get-pgdata.ts'
import { MessageBuffer } from './message-buffer.ts'
import { DelayNodeFS } from './node-delay-fs.ts'
import { debug } from './debug.ts'

const server = net.createServer()

async function makePGlite() {
  const fs = new DelayNodeFS('./dummy')
  const databasePromise = PGlite.create({ fs, extensions: { vector } })
  await fs.paused
  return {
    databasePromise,
    fs,
  }
}

let pglite = await makePGlite()
let database: PGliteInterface | undefined
let databaseId: string | undefined
let syncSocket: net.Socket | undefined

server.on('connection', async (socket) => {
  const messageBuffer = new MessageBuffer()

  socket.on('error', async (err) => {
    console.error('socket error', err)
  })

  socket.on('close', async (hadError) => {
    debug(`socket closed${hadError ? ' due to error' : ''}`)

    debug('closing database')
    await database?.close()
    database = undefined
    debug('database closed')

    debug('preparing next pglite instance')
    pglite = await makePGlite()
    debug('prepared next pglite instance')

    debug('sending done to proxy')
    syncSocket?.write('done', 'utf-8')
    debug('sended done to proxy')
  })

  socket.on('data', async (socketData) => {
    await messageBuffer.handleData(socketData, async (data) => {
      try {
        if (!database) {
          debug(`getting pgdata for database ${databaseId}`)
          const pgData = await getPgData(databaseId!)
          debug(`got pgdata for database ${databaseId}`)

          debug(`initializing database ${databaseId}`)
          pglite.fs.resume(pgData)
          database = await pglite.databasePromise
          debug(`initialized database ${databaseId}`)
        }
        debug('Message:', data.toString('hex'))
        const response = await database.execProtocolRaw(data)
        debug({ response })
        debug('Sending response:', Buffer.from(response).toString('hex'))
        socket.write(response)
      } catch (error) {
        console.error('Error processing message:', error)
        socket.destroy()
      }
    })
  })

  // tell the proxy that we are ready
  debug(`sending ready to proxy`)
  syncSocket?.write('ready', 'utf-8')
  debug(`sent ready to proxy`)
})

server.listen(5432, () => {
  console.log('Server is running on port 5432')
})

const syncServer = net.createServer()

syncServer.on('connection', (socket) => {
  syncSocket = socket
  socket.on('data', (data) => {
    databaseId = data.toString('utf-8')
  })
  socket.on('close', () => {
    syncSocket = undefined
    databaseId = undefined
  })
})

syncServer.listen(2345, () => {
  console.log('Sync server is running on port 2345')
})
