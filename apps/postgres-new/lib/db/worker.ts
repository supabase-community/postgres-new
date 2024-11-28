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

    const bc = new BroadcastChannel(`${options.id}:pg-dump`)

    bc.addEventListener('message', async (event) => {
      if (event.data.action === 'execute-dump') {
        const dump = await pgDump({ pg: db })
        const url = URL.createObjectURL(dump)
        bc.postMessage({
          action: 'dump-result',
          filename: event.data.filename,
          url,
        })
      }
    })

    return db
  },
})
