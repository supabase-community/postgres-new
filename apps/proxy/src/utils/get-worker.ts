import { scheduler } from 'node:timers/promises'
import { Mutex } from 'async-mutex'
import { getMachines, startMachine, waitMachineState, type Machine } from '../lib/fly.ts'
import type { Debugger } from 'debug'

const mutex = new Mutex()

let machinesPool = new Map<string, Machine>((await getMachines()).map((m) => [m.id, m]))
const machinesInUse = new Set<string>()

// sync with Fly API every second
setInterval(async () => {
  const machines = await getMachines()
  await mutex.runExclusive(async () => {
    machinesPool = new Map<string, Machine>(machines.map((m) => [m.id, m]))
    machines
      .filter((m) => m.state === 'suspended')
      .forEach((m) => {
        machinesInUse.delete(m.id)
      })
  })
}, 1_000)

async function getWorker(debug: Debugger): Promise<Machine> {
  const MAX_WAIT_TIME = 10_000 // 10 seconds
  const CHECK_INTERVAL = 500 // 500ms
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const result = await mutex.runExclusive(async () => {
      const availableMachine = Array.from(machinesPool.values()).find(
        (m) => m.state === 'suspended' && !machinesInUse.has(m.id)
      )

      if (availableMachine) {
        machinesInUse.add(availableMachine.id)
        return { action: 'start' as const, machine: availableMachine }
      }

      return { action: 'wait' } as const
    })

    switch (result.action) {
      case 'start': {
        debug(`starting machine ${result.machine.id}`)
        await startMachine(result.machine.id)
        await waitMachineState(result.machine.id, result.machine.instance_id, 'started')
        debug(`started machine ${result.machine.id}`)
        return result.machine
      }
      case 'wait': {
        await scheduler.wait(CHECK_INTERVAL)
        break
      }
    }
  }

  throw new Error(`no machine available after waiting ${MAX_WAIT_TIME}ms`)
}

export { getWorker }
