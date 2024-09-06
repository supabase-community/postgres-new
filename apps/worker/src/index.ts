import net from 'node:net'
import makeDebug from 'debug'
import { getPgData } from './get-pgdata.ts'
import { makePGlite } from './pglite.ts'
import { MessageBuffer } from './message-buffer.ts'
import { scheduler } from 'node:timers/promises'

const debug = makeDebug('worker')

// warmup PGlite
const pglite = await makePGlite()

const server = net.createServer()

server.on('connection', async (socket) => {
  try {
    debug('new connection')

    const databaseId = await new Promise<string>((res, rej) => {
      socket.once('data', (data) => {
        res(data.toString('utf-8'))
      })
      socket.once('error', rej)
    })
    debug(`received databaseId: ${databaseId}`)

    const pgdata = await getPgData(databaseId)
    debug(`downloaded pgdata: ${pgdata}`)

    pglite.fs.resume(pgdata)
    const database = await pglite.databasePromise
    debug(`started PGlite`)

    const messageBuffer = new MessageBuffer()
    socket.on('data', async (data) => {
      debug(`received data: ${data.toString('hex')}`)
      await messageBuffer.handleData(data, async (message) => {
        debug(`received message: ${message.toString('hex')}`)
        const result = await database.execProtocolRaw(message)
        debug(`sending result: ${Buffer.from(result).toString('hex')}`)
        socket.write(result)
      })
    })

    socket.on('error', (err) => {
      console.error('error on socket', err)
      process.exit(1)
    })

    socket.on('close', () => {
      process.exit(0)
    })

    socket.write('ready', 'utf8')
    debug('worker ready')
  } catch (e) {
    console.error('Error during connection', e)
  }
})

server.listen(5432, async () => {
  console.log('Server is running on port 5432')

  // wait for itself to be started (we had cases where the machine was not marked as started at this point)
  await fetch(
    `http://_api.internal:4280/v1/apps/${process.env.FLY_APP_NAME!}/machines/${process.env.FLY_MACHINE_ID!}/wait?instance_id=${process.env.FLY_MACHINE_VERSION!}&state=started&timeout=10`,
    {
      headers: {
        Authorization: `Bearer ${process.env.FLY_API_TOKEN!}`,
        'Content-Type': 'application/json',
      },
    }
  )

  // auto-suspend
  await fetch(
    `http://_api.internal:4280/v1/apps/${process.env.FLY_APP_NAME!}/machines/${process.env.FLY_MACHINE_ID!}/suspend`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLY_API_TOKEN!}`,
        'Content-Type': 'application/json',
      },
    }
  )
})
