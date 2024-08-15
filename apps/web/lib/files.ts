export function saveFile(id: string, file: File) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('/supabase/files', 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files')
      }
    }

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('files', 'readwrite')
      const store = transaction.objectStore('files')
      store.put(file, id)

      transaction.oncomplete = () => {
        resolve()
      }

      transaction.onerror = () => {
        console.error('File storage failed')
        reject(transaction.error)
      }
    }

    request.onerror = function () {
      console.error('IndexedDB error')
      reject(request.error)
    }
  })
}

export function loadFile(id: string) {
  return new Promise<File>((resolve, reject) => {
    const request = indexedDB.open('/supabase/files', 1)

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('files', 'readonly')
      const store = transaction.objectStore('files')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const file = getRequest.result
        resolve(file)
      }

      getRequest.onerror = () => {
        console.error('File retrieval failed')
        reject(transaction.error)
      }
    }

    request.onerror = () => {
      console.error('IndexedDB error')
      reject(request.error)
    }
  })
}
