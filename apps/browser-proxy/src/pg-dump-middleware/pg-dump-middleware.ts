import type { ClientParameters } from 'pg-gateway'
import { isGetExtensionsQuery, patchGetExtensionsResult } from './get-extensions-query.ts'
import {
  isGetExtensionMembershipQuery,
  patchGetExtensionMembershipResult,
} from './get-extension-membership-query.ts'
import { FIRST_NORMAL_OID } from './constants.ts'
import type { Socket } from 'node:net'

type ConnectionId = string

type State =
  | { step: 'wait-for-get-extensions-query' }
  | { step: 'get-extensions-query-received' }
  | { step: 'wait-for-get-extension-membership-query'; vectorOid: string }
  | { step: 'get-extension-membership-query-received'; vectorOid: string }
  | { step: 'complete' }

/**
 * Middleware to patch pg_dump results for PGlite < v0.2.8
 * PGlite < v0.2.8 has a bug in which userland extensions are not dumped because their oid is lower than FIRST_NORMAL_OID
 * This middleware patches the results of the get_extensions and get_extension_membership queries to increase the oid of the `vector` extension so it can be dumped
 * For more context, see: https://github.com/electric-sql/pglite/issues/352
 */
class PgDumpMiddleware {
  private state: Map<ConnectionId, State> = new Map()

  constructor() {}

  client(
    socket: Socket,
    connectionId: string,
    context: {
      clientParams?: ClientParameters
    },
    message: Uint8Array
  ) {
    if (context.clientParams?.application_name !== 'pg_dump') {
      return message
    }

    if (!this.state.has(connectionId)) {
      this.state.set(connectionId, { step: 'wait-for-get-extensions-query' })
      socket.on('close', () => {
        this.state.delete(connectionId)
      })
    }

    const connectionState = this.state.get(connectionId)!

    switch (connectionState.step) {
      case 'wait-for-get-extensions-query':
        // https://github.com/postgres/postgres/blob/a19f83f87966f763991cc76404f8e42a36e7e842/src/bin/pg_dump/pg_dump.c#L5834-L5837
        if (isGetExtensionsQuery(message)) {
          this.state.set(connectionId, { step: 'get-extensions-query-received' })
        }
        break
      case 'wait-for-get-extension-membership-query':
        // https://github.com/postgres/postgres/blob/a19f83f87966f763991cc76404f8e42a36e7e842/src/bin/pg_dump/pg_dump.c#L18173-L18178
        if (isGetExtensionMembershipQuery(message)) {
          this.state.set(connectionId, {
            step: 'get-extension-membership-query-received',
            vectorOid: connectionState.vectorOid,
          })
        }
        break
    }

    return message
  }

  server(
    connectionId: string,
    context: {
      clientParams?: ClientParameters
    },
    message: Uint8Array
  ) {
    if (context.clientParams?.application_name !== 'pg_dump' || !this.state.has(connectionId)) {
      return message
    }

    const connectionState = this.state.get(connectionId)!

    switch (connectionState.step) {
      case 'get-extensions-query-received':
        const patched = patchGetExtensionsResult(message)
        if (patched.vectorOid) {
          if (parseInt(patched.vectorOid) >= FIRST_NORMAL_OID) {
            this.state.set(connectionId, {
              step: 'complete',
            })
          } else {
            this.state.set(connectionId, {
              step: 'wait-for-get-extension-membership-query',
              vectorOid: patched.vectorOid,
            })
          }
        }
        return patched.message
      case 'get-extension-membership-query-received':
        const patchedMessage = patchGetExtensionMembershipResult(message, connectionState.vectorOid)
        this.state.set(connectionId, { step: 'complete' })
        return patchedMessage
      default:
        return message
    }
  }
}

export const pgDumpMiddleware = new PgDumpMiddleware()
