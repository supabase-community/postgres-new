import type { PGliteInterface, PGliteOptions, Transaction } from '@electric-sql/pglite'
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { Message } from 'ai'
import { codeBlock } from 'common-tags'
import { nanoid } from 'nanoid'

export type Database = {
  id: string
  name: string | null
  createdAt: Date
  isHidden: boolean
}

export class DbManager {
  runtimePgVersion: string | undefined
  prefix = 'playground'

  metaDbPromise: Promise<PGliteInterface> | undefined
  databaseConnections = new Map<string, Promise<PGliteInterface> | undefined>()

  constructor() {
    // Preload the PG version
    this.getRuntimePgVersion()
  }

  /**
   * Creates a PGlite instance that runs in a web worker
   */
  static async createPGlite(dataDir?: string, options?: PGliteOptions) {
    if (typeof window === 'undefined') {
      throw new Error('PGlite worker instances are only available in the browser')
    }

    return PGliteWorker.create(
      // Note the below syntax is required by webpack in order to
      // identify the worker properly during static analysis
      // see: https://webpack.js.org/guides/web-workers/
      new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
      {
        // If no data dir passed (in-memory), just create a unique ID (leader election purposes)
        id: dataDir ?? nanoid(),
        dataDir,
        ...options,
      }
    )
  }

  async getMetaDb() {
    if (this.metaDbPromise) {
      return await this.metaDbPromise
    }

    const run = async () => {
      await this.handleUnsupportedPGVersion('meta')

      const metaDb = await DbManager.createPGlite('idb://meta')
      await runMigrations(metaDb, metaMigrations)
      return metaDb
    }

    this.metaDbPromise = run().catch((err) => {
      this.metaDbPromise = undefined
      throw err
    })

    return await this.metaDbPromise
  }

  async getMessages(databaseId: string) {
    const metaDb = await this.getMetaDb()
    const { rows: messages } = await metaDb.query<Message>(
      codeBlock`
        select id, role, content, tool_invocations as "toolInvocations", created_at as "createdAt"
        from messages where database_id = $1
        order by created_at asc
      `,
      [databaseId]
    )
    return messages
  }

  async createMessage(databaseId: string, message: Message) {
    const metaDb = await this.getMetaDb()

    if (message.toolInvocations) {
      await metaDb.query(
        'insert into messages (id, database_id, role, content, tool_invocations) values ($1, $2, $3, $4, $5)',
        [
          message.id,
          databaseId,
          message.role,
          message.content,
          JSON.stringify(message.toolInvocations),
        ]
      )
    } else {
      await metaDb.query(
        'insert into messages (id, database_id, role, content) values ($1, $2, $3, $4)',
        [message.id, databaseId, message.role, message.content]
      )
    }
  }

  async getDatabases() {
    const metaDb = await this.getMetaDb()

    const { rows: databases } = await metaDb.query<Database>(
      codeBlock`
      select id, name, created_at as "createdAt", is_hidden as "isHidden"
      from databases
      where is_hidden = false
    `
    )

    return databases
  }

  async getDatabase(id: string) {
    const metaDb = await this.getMetaDb()

    const {
      rows: [database],
    } = await metaDb.query<Database>(
      codeBlock`
      select id, name, created_at as "createdAt", is_hidden as "isHidden"
      from databases
      where id = $1
    `,
      [id]
    )

    return database
  }

  async createDatabase(id: string, { isHidden }: Pick<Database, 'isHidden'>) {
    const metaDb = await this.getMetaDb()

    const {
      rows: [database],
    } = await metaDb.query<Database>(
      codeBlock`
        insert into databases (id, is_hidden)
        values ($1, $2)
        on conflict (id) do nothing
        returning id, name, created_at as "createdAt", is_hidden as "isHidden"
      `,
      [id, isHidden]
    )

    return database
  }

  async updateDatabase(id: string, { name, isHidden }: Pick<Database, 'name' | 'isHidden'>) {
    const metaDb = await this.getMetaDb()

    const {
      rows: [database],
    } = await metaDb.query<Database>(
      codeBlock`
      update databases
      set name = $2, is_hidden = $3
      where id = $1
      returning id, name, created_at as "createdAt"
    `,
      [id, name, isHidden]
    )

    return database
  }

  async deleteDatabase(id: string) {
    const metaDb = await this.getMetaDb()

    await metaDb.query<Database>(
      codeBlock`
      delete from databases
      where id = $1
    `,
      [id]
    )

    await this.deleteDbInstance(id)
  }

  async getDbInstance(id: string) {
    const openDatabasePromise = this.databaseConnections.get(id)

    if (openDatabasePromise) {
      return await openDatabasePromise
    }

    const run = async () => {
      const database = await this.getDatabase(id)

      if (!database) {
        throw new Error(`Database with ID '${id}' doesn't exist`)
      }

      const dbPath = `${this.prefix}-${id}`

      await this.handleUnsupportedPGVersion(dbPath)

      const db = await DbManager.createPGlite(`idb://${dbPath}`)
      await runMigrations(db, migrations)

      return db
    }

    const promise = run().catch((err) => {
      this.databaseConnections.delete(id)
      throw err
    })

    this.databaseConnections.set(id, promise)

    return await promise
  }

  async closeDbInstance(id: string) {
    let db = await this.databaseConnections.get(id)

    if (db && !db.closed) {
      await db.close()
      this.databaseConnections.delete(id)
    }
  }

  async deleteDbInstance(id: string) {
    await this.closeDbInstance(id)
    await this.deleteIndexedDb(`/pglite/${this.prefix}-${id}`)
  }

  /**
   * Peeks into the files of an IndexedDB-backed PGlite database
   * and returns the Postgres version it was created under (via `./PG_VERSION`).
   *
   * Useful to detect version compatibility since it doesn't require instantiating
   * a PGlite instance.
   */
  async getPGliteDBVersion(id: string) {
    const dbPath = `/pglite/${id}`
    const versionPath = `${dbPath}/PG_VERSION`

    const dbs = await indexedDB.databases()
    const databaseExists = dbs.some((db) => db.name === dbPath)

    if (!databaseExists) {
      return undefined
    }

    try {
      return await new Promise<string>((resolve, reject) => {
        const req = indexedDB.open(dbPath)

        req.onsuccess = async () => {
          const db = req.result

          try {
            const transaction = db.transaction(['FILE_DATA'], 'readonly')
            const objectStore = transaction.objectStore('FILE_DATA')

            const getReq: IDBRequest<{ contents: Int8Array }> = objectStore.get(versionPath)

            getReq.onerror = () => {
              db.close()
              reject(
                getReq.error
                  ? `An error occurred when retrieving '${versionPath}' from IndexedDB database: ${getReq.error.message}`
                  : `An unknown error occurred when retrieving '${versionPath}' from IndexedDB database`
              )
            }

            getReq.onsuccess = () => {
              const decoder = new TextDecoder()
              const version = decoder.decode(getReq.result.contents).trim()
              db.close()
              resolve(version)
            }
          } catch (err) {
            db.close()
            reject(
              err && err instanceof Error
                ? `An error occurred when opening 'FILE_DATA' object store from IndexedDB database: ${err.message}`
                : `An unknown error occurred when opening 'FILE_DATA' object store from IndexedDB database`
            )
          }
        }
        req.onerror = () => {
          reject(
            req.error
              ? `An error occurred when opening IndexedDB database: ${req.error.message}`
              : 'An unknown error occurred when opening IndexedDB database'
          )
        }
        req.onblocked = () => {
          reject('IndexedDB database was blocked when opening')
        }
      })
    } catch (err) {
      // If the retrieval failed, the DB is corrupt or not initialized, return undefined
      return undefined
    }
  }

  /**
   * Handles scenario where client had created DB with an old version of PGlite (likely 0.1.5, PG v15).
   * For now we'll simply delete and recreate it, which loses data (as 0.1.5 was only used before official release).
   *
   * In the future we need to come up with an upgrade strategy.
   */
  async handleUnsupportedPGVersion(dbPath: string) {
    const dbs = await indexedDB.databases()
    const databaseExists = dbs.some((db) => db.name === `/pglite/${dbPath}`)

    if (databaseExists) {
      const version = await this.getPGliteDBVersion(dbPath)
      const runtimeVersion = await this.getRuntimePgVersion()

      console.debug(`PG version of '${dbPath}' DB is ${version}`)
      console.debug(`PG version of PGlite runtime is ${runtimeVersion}`)

      if (version !== runtimeVersion) {
        console.warn(
          `DB '${dbPath}' is on PG version ${version}, deleting and replacing with version ${runtimeVersion}`
        )

        await this.deleteIndexedDb(`/pglite/${dbPath}`)
      }
    }
  }

  async deleteIndexedDb(name: string) {
    // Sometimes IndexedDB is still finishing a transaction even after PGlite closes
    // causing the delete to be blocked, so loop until the delete is successful
    while (true) {
      const closed = await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(name)

        req.onsuccess = () => {
          resolve(true)
        }
        req.onerror = () => {
          reject(req.error ?? 'An unknown error occurred when deleting IndexedDB database')
        }
        req.onblocked = () => {
          resolve(false)
        }
      })
      if (closed) break
    }
  }

  /**
   * Gets the Postgres version used by the current PGlite runtime.
   */
  async getRuntimePgVersion() {
    if (this.runtimePgVersion !== undefined) {
      return this.runtimePgVersion
    }

    // Create a temp DB
    const db = await DbManager.createPGlite()

    const {
      rows: [{ version }],
    } = await db.query<{ version: string }>(
      `select split_part(current_setting('server_version'), '.', 1) as version;`
    )

    this.runtimePgVersion = version

    // TODO: await this after PGlite v0.2.0-alpha.3 (currently a bug with closing DB)
    db.close()

    return version
  }
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
