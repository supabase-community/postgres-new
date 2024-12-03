import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { PGliteWorkerOptions, worker } from '@electric-sql/pglite/worker'

worker({
  async init(options: PGliteWorkerOptions) {
    return new PGlite({
      ...options,
      extensions: {
        ...options.extensions,

        // vector extension needs to be passed directly in the worker vs. main thread
        vector,
      },
    })
  },
})
