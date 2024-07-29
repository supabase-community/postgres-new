import { PGlite, PGliteInterface, Transaction } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { codeBlock } from 'common-tags'

export type Database = {
  id: string
  name: string | null
  createdAt: Date
  isHidden: boolean
}

const prefix = 'playground'

let metaDbPromise: Promise<PGliteInterface> | undefined
const databaseConnections = new Map<string, Promise<PGliteInterface> | undefined>()

export async function getMetaDb() {
  if (metaDbPromise) {
    return await metaDbPromise
  }

  async function run() {
    const metaDb = new PGlite(`idb://meta`, {
      extensions: {
        vector,
      },
    })
    await metaDb.waitReady
    await runMigrations(metaDb, metaMigrations)
    return metaDb
  }

  metaDbPromise = run().catch((err) => {
    metaDbPromise = undefined
    throw err
  })

  return await metaDbPromise
}

export async function getDb(id: string) {
  const openDatabasePromise = databaseConnections.get(id)

  if (openDatabasePromise) {
    return await openDatabasePromise
  }

  async function run() {
    const metaDb = await getMetaDb()
    const {
      rows: [database],
    } = await metaDb.query<Database>('select * from databases where id = $1', [id])

    if (!database) {
      throw new Error(`Database with ID '${id}' doesn't exist`)
    }

    const db = new PGlite(`idb://${prefix}-${id}`, {
      extensions: {
        vector,
      },
    })
    await db.waitReady
    await runMigrations(db, migrations)

    return db
  }

  const promise = run().catch((err) => {
    databaseConnections.delete(id)
    throw err
  })

  databaseConnections.set(id, promise)

  return await promise
}

export async function closeDb(id: string) {
  let db = await databaseConnections.get(id)

  if (db && !db.closed) {
    await db.close()
    databaseConnections.delete(id)
  }
}

export async function deleteDb(id: string) {
  await closeDb(id)

  // TODO: fix issue where PGlite holds on the IndexedDB preventing delete
  // Once fixed, turn this into an `await` so we can forward legitimate errors
  new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(`/pglite/${prefix}-${id}`)

    req.onsuccess = () => {
      resolve()
    }
    req.onerror = () => {
      reject('An error occurred when deleted database')
    }
    req.onblocked = () => {
      reject('Database is blocked')
    }
  })
}

type Migration = {
  version: string
  name?: string
  sql: string
}

const metaMigrations: Migration[] = [
  {
    version: '202406300001',
    name: 'databases',
    sql: codeBlock`
      create table databases (
        id text primary key,
        created_at timestamptz not null default now(),
        name text,
        is_hidden boolean not null default false
      );
    `,
  },
  {
    version: '202406300002',
    name: 'messages',
    sql: codeBlock`
      create table messages (
        id text primary key,
        database_id text not null references databases(id) on delete cascade,
        created_at timestamptz not null default now(),
        content text not null,
        role text not null check (role in ('user', 'assistant', 'tool')),
        tool_invocations jsonb
      );
    `,
  },
].sort()

const migrations: Migration[] = [
  {
    version: '202407160001',
    name: 'embeddings',
    sql: codeBlock`
      create extension if not exists vector;
    
      create schema if not exists meta;

      create table if not exists meta.embeddings (
        id bigint primary key generated always as identity,
        created_at timestamptz not null default now(),
        content text not null,
        embedding vector(384) not null
      );
    `,
  },
].sort()

export async function runMigrations(db: PGliteInterface, migrations: Migration[]) {
  await db.exec(codeBlock`
    create schema if not exists meta;

    create table if not exists meta.migrations (
      version text primary key,
      name text,
      applied_at timestamptz not null default now()
    );
  `)

  const { rows: appliedMigrations } = await db.query<{ version: string }>(
    'select version from meta.migrations order by version asc'
  )

  await db.transaction(async (tx: Transaction) => {
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i]
      const appliedMigration = appliedMigrations[i]

      if (appliedMigration) {
        if (migration.version === appliedMigration.version) {
          continue
        } else {
          throw new Error(
            `A previously applied migration was removed or new migration was added with a version less than the latest`
          )
        }
      }

      await tx.query('insert into meta.migrations (version, name) values ($1, $2)', [
        migration.version,
        migration.name,
      ])

      await tx.exec(migration.sql)
    }
  })
}
