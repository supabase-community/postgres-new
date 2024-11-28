import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { PGliteWorkerOptions, worker } from '@electric-sql/pglite/worker'
import { pgDump } from '@electric-sql/pglite-tools/pg_dump'
import { codeBlock } from 'common-tags'

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
        let dump = await pgDump({ pg: db })
        let dumpContent = await dump.text()
        // patch for old PGlite versions where the vector extension was not included in the dump
        if (!dumpContent.includes('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;')) {
          const insertPoint = 'ALTER SCHEMA meta OWNER TO postgres;'
          const insertPointIndex = dumpContent.indexOf(insertPoint) + insertPoint.length
          dumpContent = codeBlock`
            ${dumpContent.slice(0, insertPointIndex)}

            --
            -- Name: vector; Type: EXTENSION; Schema: -; Owner: -
            --
            
            CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

            ${dumpContent.slice(insertPointIndex)}`

          // Create new blob with modified content
          dump = new File([dumpContent], event.data.filename)
        }
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
