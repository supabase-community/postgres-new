import type { PGliteInterface, PGliteOptions, Transaction } from '@electric-sql/pglite'
import { raw, sql } from '@electric-sql/pglite/template'
import { PGliteWorker } from '@electric-sql/pglite/worker'
import { Message as AiMessage, ToolInvocation } from 'ai'
import { codeBlock } from 'common-tags'
import { nanoid } from 'nanoid'
import { downloadFileFromUrl } from '../util'

export type Database = {
  id: string
  name: string | null
  createdAt: Date
  isHidden: boolean
}

export type MetaMessage = {
  id: string
  databaseId: string
  role: string
  content: string
  toolInvocations: ToolInvocation[]
  createdAt: Date
}

export type Message = AiMessage & {
  apiUrl?: string
  model?: string
}

export class DbManager {
  runtimePgVersion: string | undefined
  prefix = 'playground'

  private metaDbInstance: PGliteInterface | undefined
  private metaDbPromise: Promise<PGliteInterface> | undefined
  private databaseConnections = new Map<string, Promise<PGliteInterface> | undefined>()

  constructor(metaDb?: PGliteInterface) {
    // Allow passing a custom meta DB (useful for DB imports)
    if (metaDb) {
      this.metaDbInstance = metaDb
    }

    // Preload the PG version
    this.getRuntimePgVersion()
  }

  /**
   * Creates a PGlite instance that runs in a web worker
   */
  static async createPGlite(options?: PGliteOptions & { id?: string }) {
    if (typeof window === 'undefined') {
      throw new Error('PGlite worker instances are only available in the browser')
    }

    const db = await PGliteWorker.create(
      // Note the below syntax is required by webpack in order to
      // identify the worker properly during static analysis
      // see: https://webpack.js.org/guides/web-workers/
      new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
      {
        // Opt out of PGlite worker leader election / shared DBs
        id: options?.id ?? nanoid(),
        ...options,
      }
    )

    await db.waitReady

    return db
  }

  async getMetaDb() {
    if (this.metaDbPromise) {
      return await this.metaDbPromise
    }

    const run = async () => {
      await this.handleUnsupportedPGVersion('meta')

      const metaDb =
        this.metaDbInstance ?? (await DbManager.createPGlite({ dataDir: 'idb://meta' }))
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
    const { rows: messages } = await metaDb.sql<Message>`
      select
        id,
        role,
        content,
        tool_invocations as "toolInvocations",
        created_at as "createdAt",
        api_url as "apiUrl",
        model
      from messages
      where database_id = ${databaseId}
      order by created_at asc
    `

    return messages
  }

  async createMessage(databaseId: string, message: Message) {
    const metaDb = await this.getMetaDb()

    await metaDb.sql`
      insert into messages (id, database_id, role, content, tool_invocations, api_url, model)
      values (
        ${message.id},
        ${databaseId},
        ${message.role},
        ${message.content},
        ${message.toolInvocations},
        ${message.apiUrl},
        ${message.model}
      )
    `
  }

  async exportMessages() {
    const metaDb = await this.getMetaDb()
    const { rows: messages } = await metaDb.sql<MetaMessage>`
      select id, database_id as "databaseId", role, content, tool_invocations as "toolInvocations", created_at as "createdAt"
      from messages
      order by created_at asc
    `
    return messages
  }

  async importMessages(messages: MetaMessage[]) {
    if (messages.length === 0) {
      return
    }

    const metaDb = await this.getMetaDb()

    const values = messages.map(
      (message) =>
        sql`(${message.id}, ${message.databaseId}, ${message.role}, ${message.content}, ${message.toolInvocations}, ${message.createdAt})`
    )

    return metaDb.sql`insert into messages (id, database_id, role, content, tool_invocations, created_at) values ${join(values, ',')} on conflict (id) do nothing`
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

  async exportDatabases() {
    const metaDb = await this.getMetaDb()
    const { rows: messages } = await metaDb.sql<Database>`
      select id, name, created_at as "createdAt", is_hidden as "isHidden"
      from databases
      where is_hidden = false
      order by created_at asc
    `
    return messages
  }

  async countDatabases() {
    const metaDb = await this.getMetaDb()
    type Result = { count: number }
    const { rows: messages } = await metaDb.sql<Result>`
      select count(*)
      from databases
      where is_hidden = false
    `
    const [{ count }] = messages ?? []
    if (count === undefined) {
      throw new Error('Failed to count databases')
    }
    return count
  }

  async importDatabases(databases: Database[]) {
    if (databases.length === 0) {
      return
    }

    const metaDb = await this.getMetaDb()

    const values = databases.map(
      (database) =>
        sql`(${database.id}, ${database.name ?? raw`${null}`}, ${database.createdAt}, ${database.isHidden})`
    )

    return metaDb.sql`insert into databases (id, name, created_at, is_hidden) values ${join(values, ',')} on conflict (id) do nothing`
  }

  async getDbInstance(id: string, loadDataDir?: Blob | File): Promise<PGliteInterface> {
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

      const db = await DbManager.createPGlite({ dataDir: `idb://${dbPath}`, loadDataDir, id })
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
              if (!getReq.result) {
                db.close()
                reject(`File '${versionPath}' not found in IndexedDB database`)
              }
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
  {
    version: '202411250001',
    name: 'message_model',
    sql: codeBlock`
      alter table messages add column api_url text;
      alter table messages add column model text;
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

interface TemplateContainer {
  strings: TemplateStringsArray
  values: unknown[]
}

/**
 * Joins multiple `` sql`...` `` tagged template outputs
 * using a delimiter.
 *
 * Useful for building SQL queries with a dynamic number
 * of parameters.
 */
export function join(
  templateContainers: TemplateContainer[],
  delimiter: string
): TemplateContainer {
  return templateContainers.reduce(
    (acc, container, i) => (i === 0 ? container : sql`${acc}${raw`${delimiter}`}${container}`),
    sql``
  )
}
