import * as Comlink from 'comlink'

export type FileData = {
  timestamp: Date
  mode: number
  contents?: Int8Array
}

let indexedDB: IDBFactory

export async function getIndexedDB() {
  if (indexedDB) {
    return indexedDB
  }

  const hasAccess = await document.hasStorageAccess()
  console.log({ hasAccess })

  const permission1 = await navigator.permissions.query({
    name: 'storage-access',
  } as any)

  console.log({ permission1 })

  // const handle = await (document['requestStorageAccess'] as any)()
  await document.requestStorageAccess()
  console.log(await document.hasStorageAccess())

  console.log('local storage', localStorage.getItem('test'))

  indexedDB = window.indexedDB

  const dbs = await indexedDB.databases()

  console.log('beginning', dbs)
  console.log('inside iframe', document.location.href, indexedDB)

  return indexedDB
}

async function getDatabases() {
  const indexedDB = await getIndexedDB()
  return indexedDB.databases()
}

async function getObjectStore(
  dbName: string,
  dbVersion: number,
  objectStoreName: string
): Promise<Map<IDBValidKey, FileData>> {
  const indexedDB = await getIndexedDB()

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction([objectStoreName], 'readonly')
      const objectStore = transaction.objectStore(objectStoreName)

      const getAllRequest = objectStore.getAll()
      const getAllKeysRequest = objectStore.getAllKeys()

      getAllRequest.onsuccess = () => {
        getAllKeysRequest.onsuccess = () => {
          const values = getAllRequest.result
          const keys = getAllKeysRequest.result

          const result = new Map<IDBValidKey, FileData>()
          keys.forEach((key: IDBValidKey, index: number) => {
            result.set(key, values[index])
          })

          resolve(result)
        }

        getAllKeysRequest.onerror = () => reject(getAllKeysRequest.error)
      }

      getAllRequest.onerror = () => reject(getAllRequest.error)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

const senderModule = { getDatabases, getObjectStore }
export type SenderModule = typeof senderModule

Comlink.expose(senderModule, Comlink.windowEndpoint(globalThis.parent))
