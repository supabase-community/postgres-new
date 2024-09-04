import { env } from '../env.ts'

export type MachineState =
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

export type Machine = {
  id: string
  private_ip: string
  state: MachineState
}

export async function getMachines() {
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

export async function getMachine(machineId: string) {
  return (await fetch(
    `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines/${machineId}`,
    {
      headers: {
        Authorization: `Bearer ${env.FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then((res) => res.json())) as Machine
}

export async function startMachine(machineId: string) {
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

export async function suspendMachine(machineId: string) {
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

export async function stopMachine(machineId: string) {
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

export async function destroyMachine(machineId: string) {
  return (await fetch(
    `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines/${machineId}?force=true`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${env.FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then((res) => res.json())) as { ok: boolean }
}

export async function createMachine() {
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

export async function waitMachineState(
  machineId: string,
  state: 'started' | 'stopped' | 'suspended' | 'destroyed'
) {
  const WAIT_TIMEOUT = 10
  return (await fetch(
    `http://_api.internal:4280/v1/apps/${env.WORKER_APP_NAME}/machines/${machineId}/wait?state=${state}&timeout=${WAIT_TIMEOUT}`,
    {
      headers: {
        Authorization: `Bearer ${env.FLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  ).then((res) => res.json())) as { ok: boolean }
}
