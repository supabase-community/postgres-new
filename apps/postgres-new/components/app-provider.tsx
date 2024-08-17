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

  return (
    <AppContext.Provider
      value={{
        user,
        isLoadingUser,
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
}

export const AppContext = createContext<AppContextValues | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('AppContext missing. Are you accessing useApp() outside of an AppProvider?')
  }

  return context
}
