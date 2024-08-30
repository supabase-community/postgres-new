import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { PGliteWorkerOptions, worker } from '@electric-sql/pglite/worker'
import { ltree } from '@electric-sql/pglite/contrib/ltree'
import { hstore } from '@electric-sql/pglite/contrib/hstore'
import { earthdistance } from '@electric-sql/pglite/contrib/earthdistance'
import { cube } from '@electric-sql/pglite/contrib/cube'
import { citext } from '@electric-sql/pglite/contrib/citext'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { btree_gin } from '@electric-sql/pglite/contrib/btree_gin'
import { bloom } from '@electric-sql/pglite/contrib/bloom'
import { lo } from '@electric-sql/pglite/contrib/lo'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { seg } from '@electric-sql/pglite/contrib/seg'
import { tablefunc } from '@electric-sql/pglite/contrib/tablefunc'
import { tsm_system_time } from '@electric-sql/pglite/contrib/tsm_system_time'
import { tsm_system_rows } from '@electric-sql/pglite/contrib/tsm_system_rows'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import { tcn } from '@electric-sql/pglite/contrib/tcn'
import { isn } from '@electric-sql/pglite/contrib/isn'
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch'
import { auto_explain } from '@electric-sql/pglite/contrib/auto_explain'
import { amcheck } from '@electric-sql/pglite/contrib/amcheck'
import { adminpack } from '@electric-sql/pglite/contrib/adminpack'

worker({
  async init(options: PGliteWorkerOptions) {
    return new PGlite({
      ...options,
      extensions: {
        ...options.extensions,
        // postgres extensions need to be passed directly in the worker vs. main thread
        adminpack,
        amcheck,
        auto_explain,
        bloom,
        btree_gin,
        btree_gist,
        citext,
        cube,
        earthdistance,
        fuzzystrmatch,
        hstore,
        isn,
        lo,
        ltree,
        pg_trgm,
        seg,
        tablefunc,
        tcn,
        tsm_system_rows,
        tsm_system_time,
        uuid_ossp,
        vector,
      },
    })
  },
})
