import net from 'node:net'
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

net
  .createServer(async (socket) => {
    for await (const data of socket as AsyncIterable<Buffer>) {
      const response = await database.execProtocolRaw(data)
      socket.write(response)
    }
  })
  .listen(5432, () => {
    console.log('Server listening on port 5432')
  })
