import net from 'node:net'
import process from 'node:process'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'

console.time('init database')
const database = await PGlite.create({
  dataDir: './pgdata',
  extensions: {
    vector,
  },
})
console.timeEnd('init database')

// Exit after 30 seconds if the proxy doesn't connect
const timeout = setTimeout(() => {
  process.exit(0)
}, 30_000)

net
  .createServer(async (socket) => {
    // Clear the timeout when the socket is connected
    clearTimeout(timeout)

    // Exit when the socket is closed
    socket.on('close', () => {
      process.exit(0)
    })

    for await (const data of socket as AsyncIterable<Buffer>) {
      const response = await database.execProtocolRaw(data)
      socket.write(response)
    }
  })
  .listen(5432, () => {
    console.log('Server listening on port 5432')
  })
