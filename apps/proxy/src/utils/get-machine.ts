import { env } from '../env.ts'

class Mutex {
  private mutex = Promise.resolve()

  lock(): Promise<() => void> {
    let begin: (unlock: () => void) => void = (unlock) => {}
    this.mutex = this.mutex.then(() => new Promise(begin))
    return new Promise((res) => (begin = res))
  }

  async withLock<T>(fn: () => Promise<T> | T): Promise<T> {
    const unlock = await this.lock()
    try {
      return await fn()
    } finally {
      unlock()
    }
  }
}

const MAX_WORKERS = 50
const mutex = new Mutex()

type MachineState =
  | 'created'
  | 'starting'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'suspending'
  | 'suspended'
  | 'replacing'
  | 'destroying'
  | 'destroyed'

type Machine = {
  id: string
  private_ip: string
  state: MachineState
}

let workers: Machine[] = []

async function getMachine(): Promise<Machine> {
  return mutex.withLock(async () => {
    // Refresh the list of machines
    await refreshMachines()

    // Find a suspended machine
    for (const machine of workers) {
      if (machine.state === 'suspended') {
        await startMachine(machine.id)
        return machine
      }
    }

    // If no suspended machine and below MAX_WORKERS, create a new one
    if (workers.length < MAX_WORKERS) {
      const newMachine = await createMachine()
      workers.push(newMachine)
      return newMachine
    }

    // If at MAX_WORKERS, wait for a suspended machine
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
      await refreshMachines()
      for (const machine of workers) {
        if (machine.state === 'suspended') {
          await startMachine(machine.id)
          return machine
        }
      }
    }
  })
}

async function refreshMachines(): Promise<void> {
  workers = await getMachines()
}

async function getMachines() {
  return (await fetch(
    `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines?region=${env.FLY_REGION}`,
    {
      headers: {
        Authorization: `Bearer ${env.FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then((res) => res.json())) as Machine[]
}

async function startMachine(machineId: string) {
  return (await fetch(
    `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines/${machineId}/start`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then((res) => res.json())) as {
    previous_state: 'stopped' | 'suspended'
    migrated: boolean
    new_host: string
  }
}

async function suspendMachine(machineId: string) {
  return (await fetch(
    `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines/${machineId}/suspend`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then((res) => res.json())) as { ok: boolean }
}

async function stopMachine(machineId: string) {
  return (await fetch(
    `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines/${machineId}/stop`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then((res) => res.json())) as { ok: boolean }
}

async function createMachine() {
  return (await fetch(`http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.FLY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        image: `registry.fly.io/${env.WORKER_APP_NAME}:latest`,
        guest: {
          cpu_kind: 'shared',
          cpus: 1,
          memory_mb: 512,
        },
        auto_destroy: true,
      },
    }),
  }).then((res) => res.json())) as Machine
}

export { getMachine, stopMachine, suspendMachine }
