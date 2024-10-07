class BaseEvent {
  event_message: string
  metadata: Record<string, unknown>
  constructor(event_message: string, metadata: Record<string, unknown>) {
    this.event_message = event_message
    this.metadata = metadata
  }
}

export class DatabaseShared extends BaseEvent {
  constructor(metadata: { databaseId: string; userId: string }) {
    super('database-shared', metadata)
  }
}

export class DatabaseUnshared extends BaseEvent {
  constructor(metadata: { databaseId: string; userId: string }) {
    super('database-unshared', metadata)
  }
}

export class UserConnected extends BaseEvent {
  constructor(metadata: { databaseId: string; connectionId: string }) {
    super('user-connected', metadata)
  }
}

export class UserDisconnected extends BaseEvent {
  constructor(metadata: { databaseId: string; connectionId: string }) {
    super('user-disconnected', metadata)
  }
}

type Event = DatabaseShared | DatabaseUnshared | UserConnected | UserDisconnected

export async function logEvent(event: Event) {
  if (process.env.LOGFLARE_SOURCE_URL) {
    fetch(process.env.LOGFLARE_SOURCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch((err) => {
      console.error(err)
    })
  } else if (process.env.DEBUG) {
    console.log(event)
  }
}
