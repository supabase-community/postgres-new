import * as Comlink from 'comlink'
import { FileData, SenderModule } from './sender'

export async function getSenderModule(url: string) {
  const iframe = await createIframe(url)

  if (!iframe.contentWindow) {
    throw new Error('Transfer iframe window is not available')
  }

  const senderModule = Comlink.wrap<SenderModule>(
    Comlink.windowEndpoint(iframe.contentWindow)
    // Comlink.windowEndpoint(iframe.contentWindow, globalThis, url)
  )

  return senderModule
}

export async function saveObjectStore(
  dbName: string,
  dbVersion: number,
  objectStoreName: string,
  files: Map<IDBValidKey, FileData>
) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion)

    console.log('get here')

    request.onupgradeneeded = async () => {
      const db = request.result

      console.log('in upgrade needed')

      // const transaction = db.transaction([objectStoreName], 'readwrite')
      const objectStore = db.createObjectStore(objectStoreName)

      const putRequests: Promise<void>[] = []

      console.log('about to iterate files', files)

      for (const [key, fileData] of files) {
        const putRequest = objectStore.put(fileData, key)

        const promise = new Promise<void>((resolve, reject) => {
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        })

        putRequests.push(promise)
      }

      console.log('waiting for put requests', putRequests.length)
      await Promise.all(putRequests)
      console.log('put requests done')

      resolve()
    }

    request.onerror = () => reject(request.error)
  })
}

async function createIframe(url: string) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute(
    'sandbox',
    'allow-storage-access-by-user-activation allow-scripts allow-same-origin'
  )
  iframe.src = url
  // iframe.style.display = 'none'

  document.body.appendChild(iframe)
  await new Promise((resolve) => (iframe.onload = resolve))

  return iframe
}
