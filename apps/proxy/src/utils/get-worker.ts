import { scheduler } from 'node:timers/promises'
import { Mutex } from 'async-mutex'
import {
  getMachine,
  getMachines,
  startMachine,
  stopMachine,
  suspendMachine,
  waitMachineState,
  type Machine,
} from '../lib/fly.ts'
import type { Debugger } from 'debug'

const mutex = new Mutex()

let machinesPool = new Map<string, Machine>((await getMachines()).map((m) => [m.id, m]))

async function getWorker(debug: Debugger): Promise<Machine> {
  const MAX_WAIT_TIME = 10_000 // 10 seconds
  const CHECK_INTERVAL = 1_000 // 1 second
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const result = await mutex.runExclusive(async () => {
      const availableMachine = Array.from(machinesPool.values()).find(
        (m) => m.state === 'suspended'
      )

      if (availableMachine) {
        machinesPool.set(availableMachine.id, { ...availableMachine, state: 'starting' })
        return { action: 'start' as const, machine: availableMachine }
      }

      return { action: 'wait' } as const
    })

    switch (result.action) {
      case 'start': {
        debug(`starting machine ${result.machine.id}`)
        await startMachine(result.machine.id)
        await waitMachineState(result.machine.id, result.machine.instance_id, 'started')
        await mutex.runExclusive(async () => {
          machinesPool.set(result.machine.id, { ...result.machine, state: 'started' })
        })
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

async function releaseWorker(machine: Machine): Promise<void> {
  // we need to reboot the machine to reset the worker state
  // this could be optimized if we could restart the worker from a snapshot
  await stopMachine(machine.id)
  await mutex.runExclusive(async () => {
    machinesPool.set(machine.id, { ...machine, state: 'stopping' })
  })
  await waitMachineState(machine.id, machine.instance_id, 'stopped')
  await mutex.runExclusive(async () => {
    machinesPool.set(machine.id, { ...machine, state: 'stopped' })
  })
  await startMachine(machine.id)
  await mutex.runExclusive(async () => {
    machinesPool.set(machine.id, { ...machine, state: 'starting' })
  })
  await waitMachineState(machine.id, machine.instance_id, 'started')
  await mutex.runExclusive(async () => {
    machinesPool.set(machine.id, { ...machine, state: 'started' })
  })
  // worker is suspending itself so no need to do it here
  await mutex.runExclusive(async () => {
    machinesPool.set(machine.id, { ...machine, state: 'suspending' })
  })
  await waitMachineState(machine.id, machine.instance_id, 'suspended')
  await mutex.runExclusive(async () => {
    machinesPool.set(machine.id, { ...machine, state: 'suspended' })
  })
}

export { getWorker, releaseWorker }
