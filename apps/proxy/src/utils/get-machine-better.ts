import { scheduler } from 'node:timers/promises'

import {
  createMachine,
  getMachines,
  startMachine,
  suspendMachine,
  waitMachineState,
} from '../lib/fly.ts'

const MAX_WORKERS = 50

type Worker = {
  id: string
  private_ip: string
  available: boolean
}

let workers: Worker[] = (await getMachines()).map((machine) => ({
  id: machine.id,
  private_ip: machine.private_ip,
  available: machine.state === 'suspended',
}))

class Mutex {
  private mutex = Promise.resolve()

  lock(): Promise<() => void> {
    let resolve: () => void
    const promise = new Promise<void>((res) => {
      resolve = () => res()
    })
    this.mutex = this.mutex.then(() => promise)
    return Promise.resolve(() => resolve())
  }

  async withLock<T>(fn: () => T): Promise<T> {
    const unlock = await this.lock()
    try {
      return fn()
    } finally {
      unlock()
    }
  }
}

const mutex = new Mutex()

async function getWorker(): Promise<Worker> {
  const MAX_WAIT_TIME = 10_000 // 10 seconds
  const CHECK_INTERVAL = 500 // 500ms
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    let workerToStart: Worker | undefined

    await mutex.withLock(() => {
      const availableWorker = workers.find((worker) => worker.available)
      if (availableWorker) {
        availableWorker.available = false
        workerToStart = availableWorker
        return
      }

      if (workers.length < MAX_WORKERS) {
        workerToStart = { id: '', private_ip: '', available: false }
        workers.push(workerToStart)
      }
    })

    if (workerToStart) {
      if (workerToStart.id !== '') {
        await startMachine(workerToStart.id)
      } else {
        const newMachine = await createMachine()
        workerToStart.id = newMachine.id
        workerToStart.private_ip = newMachine.private_ip
      }
      return workerToStart
    }

    // Wait for a short interval before checking again
    await scheduler.wait(CHECK_INTERVAL)
  }

  throw new Error(`No worker available after waiting ${MAX_WAIT_TIME}ms`)
}

async function releaseWorker(worker: Worker): Promise<void> {
  if (worker.available) {
    throw new Error('Worker is available, cannot release')
  }
  await suspendMachine(worker.id)
  await waitMachineState(worker.id, 'suspended')
  worker.available = true
}

export { getWorker, releaseWorker }
