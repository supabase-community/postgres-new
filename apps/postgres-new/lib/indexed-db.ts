/**
 * Opens an `IndexedDB` database via a `Promise`.
 *
 * If the database doesn't exist, `handleUpgrade` will
 * be called. Use this to create object stores.
 */
export async function openDB(
  name: string,
  version?: number,
  handleUpgrade?: (db: IDBDatabase) => void
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version)

    request.onupgradeneeded = () => {
      handleUpgrade?.(request.result)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

/**
 * Counts all objects in an `IndexedDB` object store.
 */
export async function countObjects<T>(db: IDBDatabase, storeName: string) {
  const transaction = db.transaction(storeName, 'readonly')
  const store = transaction.objectStore(storeName)
  const countRequest = store.count()

  return await new Promise<number>((resolve, reject) => {
    countRequest.onsuccess = () => {
      resolve(countRequest.result)
    }
    countRequest.onerror = () => {
      reject(countRequest.error)
    }
  })
}

/**
 * Lists all objects in an `IndexedDB` object store
 * (key and value) via an `AsyncIterable` stream.
 */
export async function* listObjects<T>(
  db: IDBDatabase,
  storeName: string
): AsyncIterable<{ key: IDBValidKey; value: T }> {
  const transaction = db.transaction(storeName, 'readonly')
  const store = transaction.objectStore(storeName)

  // List all keys, then asynchronously yield each one.
  // Note IndexedDB also offers cursors, but these don't work
  // in this context since IDB transactions close at the end
  // of each event loop, and we yield asynchronously
  const keysRequest = store.getAllKeys()
  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    keysRequest.onsuccess = () => {
      resolve(keysRequest.result)
    }
    keysRequest.onerror = () => {
      reject(keysRequest.error)
    }
  })

  for (const key of keys) {
    // Transactions auto-close at the end of each event loop,
    // so we need to create a new one each iteration
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)

    const valueRequest: IDBRequest<T> = store.get(key)
    const value = await new Promise<T>((resolve, reject) => {
      valueRequest.onsuccess = () => {
        resolve(valueRequest.result)
      }
      valueRequest.onerror = () => {
        reject(valueRequest.error)
      }
    })

    yield { key, value }
  }
}

/**
 * Check if an object in an `IndexedDB` object store exists.
 */
export async function hasObject(store: IDBObjectStore, query: IDBValidKey) {
  return new Promise<boolean>((resolve, reject) => {
    const getKeyRequest = store.getKey(query)

    getKeyRequest.onsuccess = () => {
      resolve(getKeyRequest.result !== undefined)
    }

    getKeyRequest.onerror = () => {
      reject(getKeyRequest.error)
    }
  })
}

/**
 * Retrieves an object in an `IndexedDB` object store
 * via a `Promise`.
 */
export async function getObject<T>(store: IDBObjectStore, query: IDBValidKey) {
  return new Promise<T>((resolve, reject) => {
    const getRequest = store.get(query)

    getRequest.onsuccess = () => {
      resolve(getRequest.result)
    }

    getRequest.onerror = () => {
      reject(getRequest.error)
    }
  })
}

/**
 * Retrieves an object in an `IndexedDB` object store
 * via a `Promise`.
 */
export async function putObject<T>(store: IDBObjectStore, query: IDBValidKey, value: T) {
  return new Promise<void>((resolve, reject) => {
    const putRequest = store.put(value, query)

    putRequest.onsuccess = () => {
      resolve()
    }

    putRequest.onerror = () => {
      reject(putRequest.error)
    }
  })
}
