import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type RequireProp<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

export type LockProviderProps = PropsWithChildren<{
  /**
   * The namespace for the locks. Used in both the
   * `BroadcastChannel` and the lock names.
   */
  namespace: string
}>

/**
 * A provider that manages locks across multiple tabs.
 */
export function LockProvider({ namespace, children }: LockProviderProps) {
  // Receive messages from other tabs
  const broadcastChannel = useMemo(() => new BroadcastChannel(namespace), [namespace])

  // Receive messages from self
  const selfChannel = useMemo(() => new MessageChannel(), [])
  const messagePort = selfChannel.port1

  // Track locks across all tabs
  const [locks, setLocks] = useState(new Set<string>())

  // Track locks acquired by this tab
  const [selfLocks, setSelfLocks] = useState(new Set<string>())

  const lockPrefix = `${namespace}:`

  useEffect(() => {
    async function updateLocks() {
      const locks = await navigator.locks.query()
      const held = locks.held
        ?.filter(
          (lock): lock is RequireProp<LockInfo, 'name'> =>
            lock.name !== undefined && lock.name.startsWith(lockPrefix)
        )
        .map((lock) => lock.name.slice(lockPrefix.length))

      if (!held) {
        return
      }

      setLocks(new Set(held))
    }

    updateLocks()
    messagePort.start()

    broadcastChannel.addEventListener('message', updateLocks)
    messagePort.addEventListener('message', updateLocks)

    return () => {
      broadcastChannel.removeEventListener('message', updateLocks)
      messagePort.removeEventListener('message', updateLocks)
    }
  }, [lockPrefix, broadcastChannel, messagePort])

  return (
    <LockContext.Provider
      value={{
        namespace,
        broadcastChannel,
        messagePort: selfChannel.port2,
        locks,
        selfLocks,
        setSelfLocks,
      }}
    >
      {children}
    </LockContext.Provider>
  )
}

export type LockContextValues = {
  /**
   * The namespace for the locks. Used in both the
   * `BroadcastChannel` and the lock names.
   */
  namespace: string

  /**
   * The `BroadcastChannel` used to notify other tabs
   * of lock changes.
   */
  broadcastChannel: BroadcastChannel

  /**
   * The `MessagePort` used to notify this tab of
   * lock changes.
   */
  messagePort: MessagePort

  /**
   * The set of keys locked across all tabs.
   */
  locks: Set<string>

  /**
   * The set of keys locked by this tab.
   */
  selfLocks: Set<string>

  /**
   * Set the locks acquired by this tab.
   */
  setSelfLocks: Dispatch<SetStateAction<Set<string>>>
}

export const LockContext = createContext<LockContextValues | undefined>(undefined)

/**
 * Hook to access the locks acquired by all tabs.
 * Can optionally exclude keys acquired by current tab.
 */
export function useLocks(excludeSelf = false) {
  const context = useContext(LockContext)

  if (!context) {
    throw new Error('LockContext missing. Are you accessing useLocks() outside of an LockProvider?')
  }

  let set = context.locks

  if (excludeSelf) {
    set = set.difference(context.selfLocks)
  }

  return set
}

/**
 * Hook to check if a key is locked by any tab.
 * Can optionally exclude keys acquired by current tab.
 */
export function useIsLocked(key: string, excludeSelf = false) {
  const context = useContext(LockContext)

  if (!context) {
    throw new Error(
      'LockContext missing. Are you accessing useIsLocked() outside of an LockProvider?'
    )
  }

  let set = context.locks

  if (excludeSelf) {
    set = set.difference(context.selfLocks)
  }

  return set.has(key)
}

/**
 * Hook to acquire a lock for a key across all tabs.
 */
export function useAcquireLock(key: string) {
  const context = useContext(LockContext)
  const [hasAcquiredLock, setHasAcquiredLock] = useState(false)

  if (!context) {
    throw new Error(
      'LockContext missing. Are you accessing useAcquireLock() outside of an LockProvider?'
    )
  }

  const { namespace, broadcastChannel, messagePort, setSelfLocks } = context

  const lockPrefix = `${namespace}:`
  const lockName = `${namespace}:${key}`

  useEffect(() => {
    const abortController = new AbortController()
    let releaseLock: () => void

    // Request the lock and notify listeners
    navigator.locks
      .request(lockName, { signal: abortController.signal }, () => {
        const key = lockName.startsWith(lockPrefix) ? lockName.slice(lockPrefix.length) : undefined

        if (!key) {
          return
        }

        broadcastChannel.postMessage({ type: 'acquire', key })
        messagePort.postMessage({ type: 'acquire', key })
        setHasAcquiredLock(true)
        setSelfLocks((locks) => locks.union(new Set([key])))

        return new Promise<void>((resolve) => {
          releaseLock = resolve
        })
      })
      .then(async () => {
        const key = lockName.startsWith(lockPrefix) ? lockName.slice(lockPrefix.length) : undefined

        if (!key) {
          return
        }

        broadcastChannel.postMessage({ type: 'release', key })
        messagePort.postMessage({ type: 'release', key })
        setHasAcquiredLock(false)
        setSelfLocks((locks) => locks.difference(new Set([key])))
      })
      .catch(() => {})

    // Release the lock when the component is unmounted
    function unload() {
      abortController.abort('unmount')
      releaseLock?.()
    }

    // Release the lock when the tab is closed
    window.addEventListener('beforeunload', unload)

    return () => {
      unload()
      window.removeEventListener('beforeunload', unload)
    }
  }, [lockName, lockPrefix, broadcastChannel, messagePort, setSelfLocks])

  return hasAcquiredLock
}
