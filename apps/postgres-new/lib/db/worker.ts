import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { PGliteWorkerOptions, worker } from '@electric-sql/pglite/worker'
import { pgDump } from '@electric-sql/pglite-tools/pg_dump'

worker({
  async init(options: PGliteWorkerOptions) {
    const db = new PGlite({
      ...options,
      extensions: {
        ...options.extensions,

        // vector extension needs to be passed directly in the worker vs. main thread
        vector,
      },
    })
    self.addEventListener('message', async (event) => {
      console.log('event', event)
      if (event.data.name === 'pg_dump') {
        console.log('pg_dump db', db)
        const file = await pgDump({ pg: db, fileName: event.data.filename })
        const url = URL.createObjectURL(file)
        self.postMessage({
          name: 'pg_dump_success',
          url,
          filename: event.data.filename,
        })
      }
    })
    return db
  },
})
