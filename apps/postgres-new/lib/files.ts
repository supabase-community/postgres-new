import { countObjects, getObject, hasObject, listObjects, openDB, putObject } from './indexed-db'

/**
 * Stores a file by ID.
 */
export async function saveFile(id: string, file: File) {
  const db = await openFileDB()
  const transaction = db.transaction('files', 'readwrite')
  const store = transaction.objectStore('files')
  return await putObject(store, id, file)
}

/**
 * Checks if a file with ID exists.
 */
export async function hasFile(id: string) {
  const db = await openFileDB()
  const transaction = db.transaction('files', 'readonly')
  const store = transaction.objectStore('files')
  return await hasObject(store, id)
}

/**
 * Retrieves a file by ID.
 */
export async function loadFile(id: string) {
  const db = await openFileDB()
  const transaction = db.transaction('files', 'readonly')
  const store = transaction.objectStore('files')
  return await getObject<File>(store, id)
}

/**
 * Counts all files.
 */
export async function countFiles() {
  const db = await openFileDB()
  return await countObjects<File>(db, 'files')
}

/**
 * Lists all files via an `AsyncIterable` stream.
 */
export async function* listFiles() {
  const db = await openFileDB()

  for await (const { key, value } of listObjects<File>(db, 'files')) {
    if (typeof key !== 'string') {
      throw new Error('Expected file in IndexedDB to have a string key')
    }
    yield {
      id: key,
      file: value,
    }
  }
}

/**
 * Opens the file `IndexedDB` database and creates the
 * `file` object store if it doesn't exist.
 */
export async function openFileDB() {
  return await openDB('/supabase/files', 1, (db) => {
    if (!db.objectStoreNames.contains('files')) {
      db.createObjectStore('files')
    }
  })
}
