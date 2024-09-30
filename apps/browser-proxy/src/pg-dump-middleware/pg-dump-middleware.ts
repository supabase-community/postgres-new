import ExpiryMap from 'expiry-map'
import type { ClientParameters } from 'pg-gateway'
import { isGetExtensionsQuery, patchGetExtensionsResult } from './get-extensions-query.ts'
import {
  isGetExtensionMembershipQuery,
  patchGetExtensionMembershipResult,
} from './get-extension-membership-query.ts'
import { FIRST_NORMAL_OID } from './constants.ts'

type ConnectionId = string

const state = new ExpiryMap<ConnectionId, State>(1000 * 60 * 5)

type State =
  | { step: 'wait-for-get-extensions-query' }
  | { step: 'get-extensions-query-received' }
  | { step: 'wait-for-get-extension-membership-query'; vectorOid: string }
  | { step: 'get-extension-membership-query-received'; vectorOid: string }
  | { step: 'complete' }

export function pgDumpMiddleware(
  connectionId: string,
  origin: 'client' | 'server',
  context: {
    clientParams?: ClientParameters
  },
  message: Uint8Array
) {
  if (context.clientParams?.application_name !== 'pg_dump') {
    return message
  }

  if (!state.has(connectionId)) {
    state.set(connectionId, { step: 'wait-for-get-extensions-query' })
  }

  const connectionState = state.get(connectionId)!

  switch (connectionState.step) {
    case 'wait-for-get-extensions-query':
      // https://github.com/postgres/postgres/blob/a19f83f87966f763991cc76404f8e42a36e7e842/src/bin/pg_dump/pg_dump.c#L5834-L5837
      if (origin === 'client' && isGetExtensionsQuery(message)) {
        state.set(connectionId, { step: 'get-extensions-query-received' })
      }
      return message
    case 'get-extensions-query-received':
      if (origin === 'client') {
        return message
      }
      const patched = patchGetExtensionsResult(message)
      if (patched.vectorOid) {
        if (parseInt(patched.vectorOid) >= FIRST_NORMAL_OID) {
          state.set(connectionId, {
            step: 'complete',
          })
        } else {
          state.set(connectionId, {
            step: 'wait-for-get-extension-membership-query',
            vectorOid: patched.vectorOid,
          })
        }
      }
      return patched.message
    case 'wait-for-get-extension-membership-query':
      // https://github.com/postgres/postgres/blob/a19f83f87966f763991cc76404f8e42a36e7e842/src/bin/pg_dump/pg_dump.c#L18173-L18178
      if (origin === 'client' && isGetExtensionMembershipQuery(message)) {
        state.set(connectionId, {
          step: 'get-extension-membership-query-received',
          vectorOid: connectionState.vectorOid,
        })
      }
      return message
    case 'get-extension-membership-query-received':
      if (origin === 'client') {
        return message
      }
      const patchedMessage = patchGetExtensionMembershipResult(message, connectionState.vectorOid)
      state.set(connectionId, { step: 'complete' })
      return patchedMessage
    case 'complete':
      return message
  }
}
