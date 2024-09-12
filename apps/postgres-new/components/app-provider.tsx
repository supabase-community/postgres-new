'use client'

/**
 * Holds global app data like user.
 */

import { User } from '@supabase/supabase-js'
import { Mutex } from 'async-mutex'
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
import { DbManager } from '~/lib/db'
import { useAsyncMemo } from '~/lib/hooks'
import { parseParameterStatus } from '~/lib/pg-wire-util'
import { createClient } from '~/utils/supabase/client'

export type AppProps = PropsWithChildren

// Create a singleton DbManager that isn't exposed to double mounting
const dbManager = typeof window !== 'undefined' ? new DbManager() : undefined

export default function AppProvider({ children }: AppProps) {
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [user, setUser] = useState<User>()
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false)
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

  const isPreview = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true'
  const pgliteVersion = process.env.NEXT_PUBLIC_PGLITE_VERSION
  const { value: pgVersion } = useAsyncMemo(async () => {
    if (!dbManager) {
      throw new Error('dbManager is not available')
    }

    return await dbManager.getRuntimePgVersion()
  }, [dbManager])

  const [liveSharedDatabaseId, setLiveSharedDatabaseId] = useState<string | null>(null)
  const [connectedClientIp, setConnectedClientIp] = useState<string | null>(null)
  const [liveShareWebsocket, setLiveShareWebsocket] = useState<WebSocket | null>(null)
  const cleanUp = useCallback(() => {
    setLiveShareWebsocket(null)
    setLiveSharedDatabaseId(null)
    setConnectedClientIp(null)
  }, [setLiveShareWebsocket, setLiveSharedDatabaseId, setConnectedClientIp])
  const startLiveShare = useCallback(
    async (databaseId: string) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }

      const db = await dbManager.getDbInstance(databaseId)

      const databaseHostname = `${databaseId}.${process.env.NEXT_PUBLIC_BROWSER_PROXY_DOMAIN}`

      const ws = new WebSocket(`wss://${databaseHostname}`)

      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        setLiveSharedDatabaseId(databaseId)
      }

      function toHex(uint8Array: Uint8Array) {
        return Array.from(uint8Array)
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('')
      }

      const mutex = new Mutex()

      ws.onmessage = async (event) => {
        await db._runExclusiveTransaction(async () => {
          await db._runExclusiveQuery(async () => {
            const message = new Uint8Array(await event.data)

            const messageType = String.fromCharCode(message[0])
            if (messageType === 'S') {
              const { name, value } = parseParameterStatus(message)
              if (name === 'client_ip') {
                setConnectedClientIp(value === '' ? null : value)
                return
              }
            }
            console.log('client message', message)
            console.log('client message hex', toHex(message))
            const response = await db.execProtocolRaw(message)
            console.log('server response', response)
            console.log('server response hex', toHex(response))
            ws.send(response)
          })
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
    [dbManager, cleanUp]
  )
  const stopLiveShare = useCallback(() => {
    liveShareWebsocket?.close()
    cleanUp()
  }, [cleanUp, liveShareWebsocket])
  const liveShare = {
    start: startLiveShare,
    stop: stopLiveShare,
    databaseId: liveSharedDatabaseId,
    clientIp: connectedClientIp,
    isLiveSharing: Boolean(liveSharedDatabaseId),
  }

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
        isRateLimited,
        setIsRateLimited,
        focusRef,
        isPreview,
        dbManager,
        pgliteVersion,
        pgVersion,
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
  isRateLimited: boolean
  setIsRateLimited: (limited: boolean) => void
  focusRef: RefObject<FocusHandle>
  isPreview: boolean
  dbManager?: DbManager
  pgliteVersion?: string
  pgVersion?: string
  liveShare: {
    start: (databaseId: string) => Promise<void>
    stop: () => void
    databaseId: string | null
    clientIp: string | null
    isLiveSharing: boolean
  }
}

export const AppContext = createContext<AppContextValues | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('AppContext missing. Are you accessing useApp() outside of an AppProvider?')
  }

  return context
}
