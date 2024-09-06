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
  instance_id: string
  state: MachineState
}

export async function getWorker() {
  return (await fetch(`http://postgres-new-control-plane.internal/worker`).then((res) =>
    res.json()
  )) as Promise<Machine>
}
