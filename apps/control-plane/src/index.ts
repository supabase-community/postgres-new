import { Mutex } from 'async-mutex'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import waitPort from 'wait-port'
import { getMachines, startMachine, waitMachineState, type Machine } from './lib/fly.ts'

const app = new Hono()

const mutex = new Mutex()

// sync with Fly API on boot
let machinesPool = new Map<string, Machine>((await getMachines()).map((m) => [m.id, m]))

// set of machines that are currently in use
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

app.get('/worker', async (c) => {
  const result = await mutex.runExclusive(() => {
    const availableMachine = Array.from(machinesPool.values()).find(
      (m) => m.state === 'suspended' && !machinesInUse.has(m.id)
    )

    if (availableMachine) {
      machinesInUse.add(availableMachine.id)
      return { action: 'start' as const, machine: availableMachine }
    }

    return { action: 'wait' as const }
  })

  switch (result.action) {
    case 'start': {
      await startMachine(result.machine.id)
      await waitMachineState(result.machine.id, result.machine.instance_id, 'started')
      await waitPort({
        host: result.machine.private_ip,
        port: 5432,
        output: 'silent',
      })
      return c.json(result.machine)
    }
    case 'wait': {
      return c.json({ error: 'no machines available' }, 409)
    }
  }
})

serve(
  {
    fetch: app.fetch,
    port: 80,
    hostname: '::',
  },
  () => {
    console.log('server is running on port 80')
  }
)
