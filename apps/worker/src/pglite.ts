import * as path from 'path'
import * as fs from 'fs'
import { NodeFS } from '@electric-sql/pglite/nodefs'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'

// We need to export these, they are internal paths inside the VFS, not on the main FS.
const WASM_PREFIX = '/tmp/pglite'
const PGDATA = WASM_PREFIX + '/' + 'base'

export class DelayNodeFS extends NodeFS {
  promise: Promise<void>
  resolve!: () => void
  paused: Promise<void>
  resolvePaused!: () => void

  constructor(dataDir: string) {
    super(dataDir)
    this.promise = new Promise((resolve) => {
      this.resolve = resolve
    })
    this.paused = new Promise((resolve) => {
      this.resolvePaused = resolve
    })
  }

  resume(dataDir: string) {
    this.rootDir = path.resolve(dataDir)
    if (!fs.existsSync(path.join(this.rootDir))) {
      fs.mkdirSync(this.rootDir)
    }
    this.resolve()
  }

  override async initialSyncFs(FS: any) {
    // We need to export this
    this.resolvePaused()
    await this.promise
    FS.unmount(PGDATA)
    FS.mount(FS.filesystems.NODEFS, { root: this.rootDir }, PGDATA)
    await super.initialSyncFs(FS)
  }
}

export async function makePGlite() {
  const fs = new DelayNodeFS('./dummy')
  const databasePromise = PGlite.create({ fs, extensions: { vector } })
  await fs.paused
  return {
    databasePromise,
    fs,
  }
}
