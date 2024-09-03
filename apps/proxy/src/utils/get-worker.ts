import { scheduler } from 'node:timers/promises'
import { Mutex } from 'async-mutex'
import {
  createMachine,
  destroyMachine,
  getMachines,
  startMachine,
  suspendMachine,
  waitMachineState,
} from '../lib/fly.ts'

const MAX_WORKERS = 50
const mutex = new Mutex()

type Worker = {
  id: string
  private_ip: string
  available: boolean
}

async function getWorkers(): Promise<Worker[]> {
  const machines = await getMachines()
  return machines.map((machine) => ({
    id: machine.id,
    private_ip: machine.private_ip,
    available: machine.state === 'suspended',
  }))
}

// TODO: have a better way of putting a lock when getting a worker
// we currently rely on the fly.io api to keep track of the state of the machines
// but under heavy load it's slow as API requests are queued
// and we are putting pressure on fly.io api and could get rate limited
async function getWorker(): Promise<Worker> {
  const MAX_WAIT_TIME = 10_000 // 10 seconds
  const CHECK_INTERVAL = 500 // 500ms
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const worker = await mutex.runExclusive(async () => {
      const workers = await getWorkers()

      const availableWorker = workers.find((w) => w.available)

      if (availableWorker) {
        await startMachine(availableWorker.id)
        return availableWorker
      }

      if (workers.length < MAX_WORKERS) {
        const newMachine = await createMachine()
        return {
          id: newMachine.id,
          private_ip: newMachine.private_ip,
          available: false,
        }
      }

      return null
    })

    if (worker) {
      await waitMachineState(worker.id, 'started')
      return worker
    }

    await scheduler.wait(CHECK_INTERVAL)
  }

  throw new Error(`No worker available after waiting ${MAX_WAIT_TIME}ms`)
}

async function releaseWorker(worker: Worker): Promise<void> {
  await suspendMachine(worker.id)
}

async function destroyWorker(worker: Worker): Promise<void> {
  await destroyMachine(worker.id)
}

export { getWorker, releaseWorker, destroyWorker }
