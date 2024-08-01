'use client'

/**
 * Holds global app data like user.
 */

import { User } from '@supabase/supabase-js'
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { createClient } from '~/utils/supabase/client'

export type AppProps = PropsWithChildren

export default function AppProvider({ children }: AppProps) {
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [user, setUser] = useState<User>()

  const supabase = createClient()

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

  return (
    <AppContext.Provider
      value={{
        user,
        isLoadingUser,
        signIn,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export type AppContextValues = {
  user?: User
  isLoadingUser: boolean
  signIn: () => Promise<User | undefined>
  signOut: () => Promise<void>
}

export const AppContext = createContext<AppContextValues | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error('AppContext missing. Are you accessing useApp() outside of an AppProvider?')
  }

  return context
}
