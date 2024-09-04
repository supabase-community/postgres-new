import { scheduler } from 'node:timers/promises'
import { Mutex } from 'async-mutex'
import {
  createMachine,
  destroyMachine,
  getMachine,
  getMachines,
  startMachine,
  suspendMachine,
  waitMachineState,
} from '../lib/fly.ts'

const MAX_WORKERS = 50

const mutex = new Mutex()

const workers = new Map<string, Worker>()

// sync workers state on startup
await syncWorkers()

export type Worker = {
  id: string
  private_ip: string
  available: boolean
}

async function syncWorkers() {
  const machines = await getMachines()
  workers.clear()
  for (const machine of machines) {
    workers.set(machine.id, {
      id: machine.id,
      private_ip: machine.private_ip,
      available: machine.state === 'suspended',
    })
  }
}

async function getWorker(): Promise<Worker> {
  const MAX_WAIT_TIME = 10_000 // 10 seconds
  const CHECK_INTERVAL = 500 // 500ms
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const result = await mutex.runExclusive(async () => {
      const availableWorker = Array.from(workers.values()).find((w) => w.available)

      if (availableWorker) {
        workers.set(availableWorker.id, { ...availableWorker, available: false })
        return { action: 'start' as const, worker: availableWorker }
      }

      if (workers.size < MAX_WORKERS) {
        const workerId = `${Date.now()}-${Math.random()}`
        const worker = { available: false, id: workerId, private_ip: '' }
        // we put the placeholder worker in the map so it accounts for the size
        workers.set(workerId, worker)
        return {
          action: 'create' as const,
          worker,
        }
      }

      return { action: 'wait' } as const
    })

    switch (result.action) {
      case 'start': {
        console.time(`start machine ${result.worker.id}`)
        await startMachine(result.worker.id)
        // await waitMachineState(result.worker.id, 'started')
        console.timeEnd(`start machine ${result.worker.id}`)
        return result.worker
      }
      case 'create': {
        console.time('create a new machine')
        const machine = await createMachine()
        // await waitMachineState(machine.id, 'started')
        console.timeEnd('create a new machine')
        // replace the placeholder worker with the actual worker
        return await mutex.runExclusive(async () => {
          workers.delete(result.worker.id)
          const worker = {
            id: machine.id,
            private_ip: machine.private_ip,
            available: false,
          }
          workers.set(worker.id, worker)
          return worker
        })
      }
      case 'wait': {
        await scheduler.wait(CHECK_INTERVAL)
        break
      }
    }
  }

  throw new Error(`No worker available after waiting ${MAX_WAIT_TIME}ms`)
}

async function releaseWorker(worker: Worker): Promise<void> {
  await suspendMachine(worker.id)
  await waitMachineState(worker.id, 'suspended')
  // workaround until Fly fixes the "wait" API
  while (true) {
    const machine = await getMachine(worker.id)
    if (machine.state === 'suspended') {
      break
    }
    await scheduler.wait(1_000)
  }
  await mutex.runExclusive(async () => {
    workers.set(worker.id, { ...worker, available: true })
  })
}

async function destroyWorker(worker: Worker): Promise<void> {
  await destroyMachine(worker.id)
  await waitMachineState(worker.id, 'destroyed')
  await mutex.runExclusive(async () => {
    workers.delete(worker.id)
  })
}

export { getWorker, releaseWorker, destroyWorker }
