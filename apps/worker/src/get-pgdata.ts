import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { exec as execCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { decompressArchive } from './decompress-archive.ts'
const exec = promisify(execCallback)

const s3 = new S3Client({ forcePathStyle: true })

async function exists(folderPath: string) {
  try {
    await fs.access(folderPath)
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    } else {
      throw error
    }
  }
}

class LRUCache {
  private diskUsageThreshold: number
  public cachePath: string

  constructor(options?: { cachePath?: string; diskUsageThreshold?: number }) {
    this.cachePath = options?.cachePath ?? '/tmp/dbs'
    this.diskUsageThreshold = options?.diskUsageThreshold ?? 0.9
  }

  private async getCurrentDiskUsage(): Promise<number> {
    const { stdout } = await exec("df -h / | awk 'NR==2 {print $5}'")
    const usage = stdout.trim().replace('%', '')
    return parseFloat(usage) / 100
  }

  private async ensureDiskUsage(): Promise<void> {
    let diskUsage = await this.getCurrentDiskUsage()
    if (diskUsage > this.diskUsageThreshold) {
      const entries = await fs.readdir(this.cachePath)
      const entryPaths = entries.map((entry) => path.join(this.cachePath, entry))

      const sortedEntries = await Promise.all(
        entryPaths.map(async (entryPath) => {
          const stats = await fs.stat(entryPath)
          return { path: entryPath, mtime: stats.mtime }
        })
      )
      sortedEntries.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())

      for (const entry of sortedEntries) {
        if (diskUsage <= this.diskUsageThreshold) break
        await fs.rmdir(entry.path, { recursive: true })
        diskUsage = await this.getCurrentDiskUsage()
      }
    }
  }

  public async has(databaseId: string): Promise<boolean> {
    const targetPath = path.join(this.cachePath, databaseId)
    return await exists(targetPath)
  }

  public async set(databaseId: string) {
    const targetPath = path.join(this.cachePath, databaseId)

    console.time(`download pgdata for database ${databaseId}`)
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: `dbs/${databaseId}.tar.gz`,
      })
    )
    console.timeEnd(`download pgdata for database ${databaseId}`)

    if (!response.Body) {
      throw new Error('No body in response')
    }

    console.time(`decompress pgdata for database ${databaseId}`)
    await decompressArchive(response.Body.transformToWebStream(), targetPath)
    console.timeEnd(`decompress pgdata for database ${databaseId}`)

    await this.ensureDiskUsage()
  }

  public async get(databaseId: string): Promise<string | undefined> {
    const targetPath = path.join(this.cachePath, databaseId)
    if (!(await exists(targetPath))) {
      return undefined
    }
    return targetPath
  }

  public async delete(databaseId: string) {
    const targetPath = path.join(this.cachePath, databaseId)
    if (await exists(targetPath)) {
      await fs.rmdir(targetPath, { recursive: true })
    }
  }
}

const cache = new LRUCache()

export async function getPgData(databaseId: string) {
  if (!(await cache.has(databaseId))) {
    await cache.set(databaseId)
  }
  return (await cache.get(databaseId))!
}
