'use client'

/**
 * Holds global app data like user.
 */

import { User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { Mutex } from 'async-mutex'
import { debounce } from 'lodash'
import { isQuery, parseQuery as parseQueryMessage } from '@supabase-labs/pg-protocol/frontend'
import { isErrorResponse } from '@supabase-labs/pg-protocol/backend'
import {
  createContext,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { getTablesQueryKey } from '~/data/tables/tables-query'
import { DbManager } from '~/lib/db'
import { useAsyncMemo } from '~/lib/hooks'
import {
  getMessages,
  isReadyForQuery,
  isStartupMessage,
  isTerminateMessage,
  parseReadyForQuery,
  parseStartupMessage,
} from '~/lib/pg-wire-util'
import { legacyDomainHostname } from '~/lib/util'
import { parse, serialize } from '~/lib/websocket-protocol'
import { createClient } from '~/utils/supabase/client'
import { assertDefined, isMigrationStatement } from '~/lib/sql-util'
import type { ParseResult } from 'libpg-query/wasm'
import { generateId, Message } from 'ai'
import { getMessagesQueryKey } from '~/data/messages/messages-query'

export type AppProps = PropsWithChildren

// Create a singleton DbManager that isn't exposed to double mounting
const dbManager = typeof window !== 'undefined' ? new DbManager() : undefined

function useLiveShare() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [liveSharedDatabaseId, setLiveSharedDatabaseId] = useState<string | null>(null)
  const [connectedClientIp, setConnectedClientIp] = useState<string | null>(null)
  const [liveShareWebsocket, setLiveShareWebsocket] = useState<WebSocket | null>(null)

  const cleanUp = useCallback(() => {
    setLiveShareWebsocket(null)
    setLiveSharedDatabaseId(null)
    setConnectedClientIp(null)
  }, [setLiveShareWebsocket, setLiveSharedDatabaseId, setConnectedClientIp])

  const startLiveShare = useCallback(
    async (databaseId: string, options?: { captureMigrations?: boolean }) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }

      const databaseHostname = `${databaseId}.${process.env.NEXT_PUBLIC_BROWSER_PROXY_DOMAIN}`

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('You must be signed in to live share')
      }

      const ws = new WebSocket(
        `wss://${databaseHostname}?token=${encodeURIComponent(session.access_token)}`
      )

      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        setLiveSharedDatabaseId(databaseId)
      }

      const db = await dbManager.getDbInstance(databaseId)
      const mutex = new Mutex()
      let activeConnectionId: string | null = null

      // Invalidate 'tables' query to refresh schema UI.
      // Debounce so that we only invalidate once per
      // sequence of back-to-back queries.
      const invalidateTables = debounce(async () => {
        await queryClient.invalidateQueries({
          queryKey: getTablesQueryKey({ databaseId, schemas: ['public', 'meta'] }),
        })
      }, 50)

      ws.onmessage = (event) => {
        mutex.runExclusive(async () => {
          const data = new Uint8Array(await event.data)

          const { connectionId, message } = parse(data)

          if (isStartupMessage(message)) {
            activeConnectionId = connectionId
            const parameters = parseStartupMessage(message)
            if ('client_ip' in parameters) {
              setConnectedClientIp(parameters.client_ip)
            }
            return
          }

          if (isTerminateMessage(message)) {
            activeConnectionId = null
            setConnectedClientIp(null)
            // reset session state
            await db.query('rollback').catch(() => {})
            await db.query('discard all')
            await db.query('set search_path to public')
            return
          }

          if (activeConnectionId !== connectionId) {
            console.error('received message from inactive connection', {
              activeConnectionId,
              connectionId,
            })
            return
          }

          const response = await db.execProtocolRaw(message)

          ws.send(serialize(connectionId, response))

          // Capture migrations if enabled
          if (options?.captureMigrations && !isErrorResponse(response)) {
            const { deparse, parseQuery } = await import('libpg-query/wasm')
            if (isQuery(message)) {
              const parsedMessage = parseQueryMessage(message)
              const parseResult = await parseQuery(parsedMessage.query)
              assertDefined(parseResult.stmts, 'Expected stmts to exist in parse result')
              const migrationStmts = parseResult.stmts.filter(isMigrationStatement)
              if (migrationStmts.length > 0) {
                const filteredAst: ParseResult = {
                  version: parseResult.version,
                  stmts: migrationStmts,
                }
                const migrationSql = await deparse(filteredAst)
                const chatMessage: Message = {
                  id: generateId(),
                  role: 'assistant',
                  content: '',
                  toolInvocations: [
                    {
                      state: 'result',
                      toolCallId: generateId(),
                      toolName: 'executeSql',
                      args: { sql: migrationSql },
                      result: { success: true },
                    },
                  ],
                }
                await dbManager.createMessage(databaseId, chatMessage)
                // invalidate messages query to refresh the migrations tab
                await queryClient.invalidateQueries({
                  queryKey: getMessagesQueryKey(databaseId),
                })
              }
            }
          }

          // Refresh table UI when safe to do so
          // A backend response can have multiple wire messages
          const backendMessages = Array.from(getMessages(response))
          const lastMessage = backendMessages.at(-1)

          // Only refresh if the last message is 'ReadyForQuery'
          if (lastMessage && isReadyForQuery(lastMessage)) {
            const { transactionStatus } = parseReadyForQuery(lastMessage)

            // Do not refresh if we are in the middle of a transaction
            // (refreshing causes SQL to run against the PGlite instance)
            if (transactionStatus !== 'transaction') {
              await invalidateTables()
            }
          }
        })
      }
      ws.onclose = (event) => {
        cleanUp()
      }
      ws.onerror = (error) => {
        console.error('webSocket error:', error)
        cleanUp()
      }

      setLiveShareWebsocket(ws)
    },
    [cleanUp, supabase.auth, queryClient]
  )

  const stopLiveShare = useCallback(() => {
    liveShareWebsocket?.close()
    cleanUp()
  }, [cleanUp, liveShareWebsocket])

  return {
    start: startLiveShare,
    stop: stopLiveShare,
    databaseId: liveSharedDatabaseId,
    clientIp: connectedClientIp,
    isLiveSharing: Boolean(liveSharedDatabaseId),
  }
}
type LiveShare = ReturnType<typeof useLiveShare>

export default function AppProvider({ children }: AppProps) {
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [user, setUser] = useState<User>()
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)

  const focusRef = useRef<FocusHandle>(null)

  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((e) => {
      focusRef.current?.focus()
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const loadUser = useCallback(async () => {
    setIsLoadingUser(true)
    try {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        // TODO: handle error
        setUser(undefined)
        return
      }

      const { user } = data

      setUser(user)

      return user
    } finally {
      setIsLoadingUser(false)
    }
  }, [supabase])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const signIn = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.toString(),
      },
    })

    if (error) {
      // TODO: handle sign in error
    }

    const user = await loadUser()
    return user
  }, [supabase, loadUser])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      // TODO: handle sign out error
    }

    setUser(undefined)
  }, [supabase])

  const pgliteVersion = process.env.NEXT_PUBLIC_PGLITE_VERSION
  const { value: pgVersion } = useAsyncMemo(async () => {
    if (!dbManager) {
      throw new Error('dbManager is not available')
    }

    return await dbManager.getRuntimePgVersion()
  }, [dbManager])

  const [isLegacyDomain, setIsLegacyDomain] = useState(false)
  const [isLegacyDomainRedirect, setIsLegacyDomainRedirect] = useState(false)

  useEffect(() => {
    const isLegacyDomain = window.location.hostname === legacyDomainHostname
    const urlParams = new URLSearchParams(window.location.search)
    const isLegacyDomainRedirect = urlParams.get('from') === legacyDomainHostname

    // Set via useEffect() to prevent SSR hydration issues
    setIsLegacyDomain(isLegacyDomain)
    setIsLegacyDomainRedirect(isLegacyDomainRedirect)
    setIsRenameDialogOpen(isLegacyDomain || isLegacyDomainRedirect)
  }, [])

  const liveShare = useLiveShare()

  return (
    <AppContext.Provider
      value={{
        user,
        isLoadingUser,
        liveShare,
        signIn,
        signOut,
        isSignInDialogOpen,
        setIsSignInDialogOpen,
        isRenameDialogOpen,
        setIsRenameDialogOpen,
        isRateLimited,
        setIsRateLimited,
        focusRef,
        dbManager,
        pgliteVersion,
        pgVersion,
        isLegacyDomain,
        isLegacyDomainRedirect,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export type FocusHandle = {
  focus(): void
}

export type AppContextValues = {
  user?: User
  isLoadingUser: boolean
  signIn: () => Promise<User | undefined>
  signOut: () => Promise<void>
  isSignInDialogOpen: boolean
  setIsSignInDialogOpen: (open: boolean) => void
  isRenameDialogOpen: boolean
  setIsRenameDialogOpen: (open: boolean) => void
  isRateLimited: boolean
  setIsRateLimited: (limited: boolean) => void
  focusRef: RefObject<FocusHandle>
  dbManager?: DbManager
  pgliteVersion?: string
  pgVersion?: string
  liveShare: LiveShare
  isLegacyDomain: boolean
  isLegacyDomainRedirect: boolean
}

export const AppContext = createContext<AppContextValues | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('AppContext missing. Are you accessing useApp() outside of an AppProvider?')
  }

  return context
}
