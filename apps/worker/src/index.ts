import net from 'node:net'
import process from 'node:process'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { s3GetObject } from './s3-get-object.ts'

console.time('download tarball')
const response = await s3GetObject({
  bucket: process.env.AWS_S3_BUCKET!,
  endpoint: process.env.AWS_ENDPOINT_URL_S3!,
  region: process.env.AWS_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  key: `dbs/${process.env.DATABASE_ID}.tar.gz`,
})
const file = new Blob([await response.arrayBuffer()], { type: 'application/gzip' })
console.timeEnd('download tarball')

console.time('init database')
const database = new PGlite({
  loadDataDir: file,
  extensions: {
    vector,
  },
})
await database.waitReady
console.timeEnd('init database')

net
  .createServer(async (socket) => {
    socket.on('data', async (data) => {
      socket.write(await database.execProtocolRaw(data))
    })
  })
  .listen(5432, () => {
    console.log('Server listening on port 5432')
  })
