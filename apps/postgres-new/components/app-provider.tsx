'use client'

/**
 * Holds global app data like user.
 */

import { User } from '@supabase/supabase-js'
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

  const [databaseUrl, setDatabaseUrl] = useState<string | null>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const startSharingDatabase = useCallback(
    async (databaseId: string) => {
      if (!dbManager) {
        throw new Error('dbManager is not available')
      }

      const db = await dbManager.getDbInstance(databaseId)

      const ws = new WebSocket(`wss://${databaseId}.${process.env.NEXT_PUBLIC_WS_DOMAIN}`)

      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        const databaseUrl = `postgres://postgres@${databaseId}.${process.env.NEXT_PUBLIC_DB_DOMAIN}/postgres`
        setDatabaseUrl(databaseUrl)
      }
      ws.onmessage = async (event) => {
        const message = new Uint8Array(await event.data)
        const response = await db.execProtocolRaw(message)
        ws.send(response)
      }
      ws.onclose = (event) => {
        setDatabaseUrl(null)
      }
      ws.onerror = (error) => {
        console.error('webSocket error:', error)
        setDatabaseUrl(null)
      }

      setWs(ws)
    },
    [dbManager]
  )
  const stopSharingDatabase = useCallback(() => {
    ws?.close()
    setWs(null)
    setDatabaseUrl(null)
  }, [ws])
  const shareDatabase = {
    start: startSharingDatabase,
    stop: stopSharingDatabase,
    databaseUrl,
    isSharing: Boolean(databaseUrl),
  }

  return (
    <AppContext.Provider
      value={{
        user,
        isLoadingUser,
        shareDatabase,
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
  shareDatabase: {
    start: (databaseId: string) => Promise<void>
    stop: () => void
    databaseUrl: string | null
    isSharing: boolean
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
