import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type DatabaseLocks = {
  [databaseId: string]: string // databaseId -> tabId mapping
}

function getTabId() {
  const stored = sessionStorage.getItem('tabId')
  if (stored) return stored

  const newId = crypto.randomUUID()
  sessionStorage.setItem('tabId', newId)
  return newId
}

const DatabaseLocksContext = createContext<{
  locks: DatabaseLocks
  acquireLock: (databaseId: string) => void
  releaseLock: (databaseId: string) => void
}>({
  locks: {},
  acquireLock: () => {},
  releaseLock: () => {},
})

export function DatabaseLocksProvider({ children }: { children: React.ReactNode }) {
  const tabId = getTabId()
  const lockKey = 'dbLocks'

  // Initialize with current localStorage state
  const [locks, setLocks] = useState<DatabaseLocks>(() =>
    JSON.parse(localStorage.getItem(lockKey) || '{}')
  )

  const acquireLock = useCallback(
    (databaseId: string) => {
      const currentLocks = JSON.parse(localStorage.getItem(lockKey) || '{}') as DatabaseLocks

      if (!(databaseId in currentLocks)) {
        const newLocks = { ...currentLocks, [databaseId]: tabId }
        localStorage.setItem(lockKey, JSON.stringify(newLocks))
        setLocks(newLocks)
      }
    },
    [tabId]
  )

  const releaseLock = useCallback(
    (databaseId: string) => {
      const currentLocks = JSON.parse(localStorage.getItem(lockKey) || '{}') as DatabaseLocks

      if (currentLocks[databaseId] === tabId) {
        const { [databaseId]: _, ...newLocks } = currentLocks

        if (Object.keys(newLocks).length === 0) {
          localStorage.removeItem(lockKey)
        } else {
          localStorage.setItem(lockKey, JSON.stringify(newLocks))
        }

        setLocks(newLocks)
      }
    },
    [tabId]
  )

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === lockKey) {
        setLocks(JSON.parse(event.newValue || '{}'))
      }
    }

    window.addEventListener('storage', handleStorageChange)

    const handleBeforeUnload = () => {
      const currentLocks = JSON.parse(localStorage.getItem(lockKey) || '{}') as DatabaseLocks
      const newLocks: DatabaseLocks = {}

      for (const [dbId, lockingTabId] of Object.entries(currentLocks)) {
        if (lockingTabId !== tabId) {
          newLocks[dbId] = lockingTabId
        }
      }

      if (Object.keys(newLocks).length === 0) {
        localStorage.removeItem(lockKey)
      } else {
        localStorage.setItem(lockKey, JSON.stringify(newLocks))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [lockKey, tabId])

  return (
    <DatabaseLocksContext.Provider value={{ locks, acquireLock, releaseLock }}>
      {children}
    </DatabaseLocksContext.Provider>
  )
}

export function useDatabaseLock(databaseId: string) {
  const context = useContext(DatabaseLocksContext)
  const tabId = getTabId()

  if (!context) {
    throw new Error('useDatabaseLock must be used within a DatabaseLocksProvider')
  }

  const { locks, acquireLock, releaseLock } = context
  const isLocked = locks[databaseId] !== undefined && locks[databaseId] !== tabId

  useEffect(() => {
    acquireLock(databaseId)

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'dbLocks') {
        const newLocks = JSON.parse(event.newValue || '{}') as DatabaseLocks
        const isAvailable = !(databaseId in newLocks)

        if (isAvailable) {
          console.log('Database became available, acquiring lock:', databaseId)
          acquireLock(databaseId)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      releaseLock(databaseId)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [databaseId, acquireLock, releaseLock])

  return isLocked
}

export function useIsLocked(databaseId: string) {
  const context = useContext(DatabaseLocksContext)
  const tabId = getTabId()

  if (!context) {
    throw new Error('useIsLocked must be used within a DatabaseLocksProvider')
  }

  const { locks } = context
  return locks[databaseId] !== undefined && locks[databaseId] !== tabId
}
