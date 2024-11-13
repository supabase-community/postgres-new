import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const DATABASE_LOCK_PREFIX = 'database-build-db-lock:'

async function getLocks() {
  const result = await navigator.locks.query()
  if (result.held) {
    return result.held
      .map((lock) => lock.name)
      .filter((name): name is string => name !== null && name!.startsWith(DATABASE_LOCK_PREFIX))
      .map((name) => name.slice(DATABASE_LOCK_PREFIX.length))
  }
  return []
}

type DatabaseLocksContextState = {
  locks: string[]
  activeLock: { databaseId: string; release: () => void } | null
}

const DatabaseLocksContext = createContext<{
  state: DatabaseLocksContextState
  acquireLock: (databaseId: string) => void
  releaseLock: (databaseId: string) => void
}>({
  state: {
    locks: [],
    activeLock: null,
  },
  acquireLock: () => {},
  releaseLock: () => {},
})

export function DatabaseLocksProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DatabaseLocksContextState>({
    locks: [],
    activeLock: null,
  })

  // Initialize with current navigator.locks state
  useEffect(() => {
    async function initLocks() {
      const locks = await getLocks()
      setState((previousState) => ({ ...previousState, locks }))
    }
    initLocks()
  }, [])

  const acquireLock = useCallback(
    async (databaseId: string) => {
      let resolve: () => void
      const lockPromise = new Promise<void>((res) => {
        resolve = res
      })
      navigator.locks.request(`${DATABASE_LOCK_PREFIX}${databaseId}`, () => lockPromise)
      setState((previousState) => ({
        activeLock: { databaseId, release: resolve },
        locks: [...previousState.locks, databaseId],
      }))
    },
    [state, setState]
  )

  const releaseLock = useCallback(
    async (databaseId: string) => {
      state.activeLock?.release()
      setState((previousState) => ({
        activeLock: null,
        locks: previousState.locks.filter((id) => id !== databaseId),
      }))
    },
    [state, setState]
  )

  return (
    <DatabaseLocksContext.Provider value={{ state, acquireLock, releaseLock }}>
      {children}
    </DatabaseLocksContext.Provider>
  )
}

export function useDatabaseLock(databaseId: string) {
  const context = useContext(DatabaseLocksContext)

  if (!context) {
    throw new Error('useDatabaseLock must be used within a DatabaseLocksProvider')
  }

  const { state, acquireLock, releaseLock } = context

  const isLocked = state.locks.includes(databaseId) && state.activeLock?.databaseId !== databaseId

  useEffect(() => {
    acquireLock(databaseId)

    return () => {
      releaseLock(databaseId)
    }
  }, [databaseId])

  return isLocked
}

export function useIsLocked(databaseId: string) {
  const context = useContext(DatabaseLocksContext)

  if (!context) {
    throw new Error('useIsLocked must be used within a DatabaseLocksProvider')
  }

  const { state } = context

  return state.locks.includes(databaseId) && state.activeLock?.databaseId !== databaseId
}
