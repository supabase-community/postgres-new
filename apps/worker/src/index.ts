// import net from 'node:net'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { iterateReader } from '@std/io/iterate-reader'

console.time('init database')
const database = await PGlite.create({
  dataDir: './pgdata',
  extensions: {
    vector,
  },
})
console.timeEnd('init database')

const listener = Deno.listen({ port: 5432 })

for await (const conn of listener) {
  for await (const data of iterateReader(conn)) {
    const response = await database.execProtocolRaw(data)
    await conn.write(response)
  }
}
