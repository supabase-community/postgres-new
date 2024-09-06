import { Mutex } from 'async-mutex'

export class ConnectionStore {
  private connections: Map<string, number>
  private mutex: Mutex
  private maxConnections: number

  constructor(options: { maxConnections: number }) {
    this.connections = new Map()
    this.mutex = new Mutex()
    this.maxConnections = options.maxConnections
  }

  async increment(databaseId: string): Promise<{ success: boolean; count: number }> {
    return this.mutex.runExclusive(() => {
      const currentCount = this.connections.get(databaseId) || 0
      const newCount = currentCount + 1

      if (newCount > this.maxConnections) {
        return { success: false, count: currentCount }
      }

      this.connections.set(databaseId, newCount)
      return { success: true, count: newCount }
    })
  }

  async decrement(databaseId: string): Promise<number> {
    return this.mutex.runExclusive(() => {
      const currentCount = this.connections.get(databaseId) ?? 0
      const newCount = Math.max(0, currentCount - 1)
      this.connections.set(databaseId, newCount)
      return newCount
    })
  }

  async getCount(databaseId: string): Promise<number> {
    return this.mutex.runExclusive(() => {
      return this.connections.get(databaseId) ?? 0
    })
  }
}
