'use client'

import { TarStream, TarStreamInput } from '@std/tar/tar-stream'
import { chunk } from 'lodash'
import Link from 'next/link'
import { useState } from 'react'
import { useApp } from '~/components/app-provider'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Progress } from '~/components/ui/progress'
import { DbManager } from '~/lib/db'
import { countFiles, listFiles } from '~/lib/files'
import {
  fileFromStream,
  fileToTarStreamFile,
  mergeIterables,
  readableStreamFromIterable,
  transformStreamFromFn,
} from '~/lib/streams'
import {
  currentDomainHostname,
  currentDomainUrl,
  downloadFile,
  legacyDomainHostname,
} from '~/lib/util'

export default function Page() {
  const { dbManager } = useApp()
  const [progress, setProgress] = useState<number>()

  return (
    <>
      <Dialog open>
        <DialogContent className="max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Export your databases</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <p>
            {legacyDomainHostname} is renaming to {currentDomainHostname}, which means you need to
            transfer your databases if you wish to continue using them.
          </p>

          <Accordion type="single" collapsible>
            <AccordionItem value="item-1" className="border rounded-md">
              <AccordionTrigger className="p-0 gap-2 px-3 py-2">
                <div className="flex gap-2 items-center font-normal text-lighter text-sm">
                  <span>
                    Why is {legacyDomainHostname} renaming to {currentDomainHostname}?
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-3 prose prose-sm">
                This project is not an official Postgres project and we don&apos;t want to mislead
                anyone! We&apos;re renaming to{' '}
                <Link href={currentDomainUrl} className="underline">
                  {currentDomainHostname}
                </Link>{' '}
                because, well, that&apos;s what this does. This will still be 100% Postgres-focused,
                just with a different URL.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1" className="border rounded-md">
              <AccordionTrigger className="p-0 gap-2 px-3 py-2">
                <div className="flex gap-2 items-center font-normal text-lighter text-sm">
                  <span>Why do I need to export my databases?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-3 prose prose-sm">
                <p>
                  Since PGlite databases are stored in your browser&apos;s IndexedDB storage, other
                  domains like{' '}
                  <Link href={currentDomainUrl} className="underline">
                    {currentDomainHostname}
                  </Link>{' '}
                  cannot access them directly (this is a security restriction built into every
                  browser).
                </p>
                <p>
                  If you&apos;d like to continue using your previous databases and conversations:
                  <ol>
                    <li>Export them from {legacyDomainHostname}</li>
                    <li>Import them to {currentDomainHostname}</li>
                  </ol>
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="my-2 border-b" />
          <div className="prose">
            <h4 className="mb-4">How to transfer your databases to {currentDomainHostname}</h4>
            <ol>
              <li>
                Click <strong>Export</strong> to download all of your databases into a single
                tarball.
                <br />
                {progress === undefined ? (
                  <Button
                    className="my-2"
                    onClick={async () => {
                      if (!dbManager) {
                        throw new Error('dbManager is not available')
                      }

                      setProgress(0)

                      const dbCount = await dbManager.countDatabases()
                      const fileCount = await countFiles()

                      // Plus 1 for the meta DB
                      const totalFiles = 1 + dbCount + fileCount

                      // Passthrough stream to increment progress bar
                      const progressPassthrough = transformStreamFromFn<
                        TarStreamInput,
                        TarStreamInput
                      >((chunk) => {
                        if (chunk.type === 'file') {
                          setProgress((progress) => (progress ?? 0) + 100 / totalFiles)
                        }
                        return chunk
                      })

                      const fileStream = mergeIterables([
                        createDumpStream(dbManager),
                        createStorageStream(),
                      ])

                      const tarGzStream = readableStreamFromIterable(fileStream)
                        .pipeThrough(progressPassthrough)
                        .pipeThrough(new TarStream())
                        .pipeThrough<Uint8Array>(new CompressionStream('gzip'))

                      const file = await fileFromStream(
                        tarGzStream,
                        `${location.hostname}.tar.gz`,
                        { type: 'application/x-gzip' }
                      )

                      downloadFile(file)
                    }}
                  >
                    Export
                  </Button>
                ) : (
                  <div className="flex gap-2 text-xs items-center">
                    <Progress className="my-2 w-[60%]" value={Math.round(progress)} />
                    {Math.round(progress)}%
                  </div>
                )}
                <br />
                This tarball will contain every PGlite database&apos;s <code>pgdata</code> dump
                along with any files you imported or exported from {legacyDomainHostname}.
              </li>
              <li>
                Navigate to{' '}
                <Link href={`${currentDomainUrl}/import`}>{currentDomainHostname}/import</Link> and
                click <strong>Import</strong>.
              </li>
            </ol>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Generates a stream of PGlite dumps for all the databases as tar file/directory entries.
 */
async function* createDumpStream(
  dbManager: DbManager,
  batchSize = 5
): AsyncIterable<TarStreamInput> {
  const databases = await dbManager.exportDatabases()
  const batches = chunk(databases, batchSize)

  // Meta DB has to be dumped separately
  // We intentionally yield this first so that it is
  // first in the archive
  const metaDb = await dbManager.getMetaDb()
  const metaDump = await metaDb.dumpDataDir('gzip')
  yield fileToTarStreamFile(new File([metaDump], 'meta.tar.gz', { type: metaDump.type }))

  yield { type: 'directory', path: '/dbs' }

  // Dump in batches to avoid excessive RAM use
  for (const batch of batches) {
    // All PGlite instances within a batch are loaded in parallel
    yield* await Promise.all(
      batch.map(async ({ id }) => {
        const db = await dbManager.getDbInstance(id)
        const dump = await db.dumpDataDir('gzip')
        const file = new File([dump], `${id}.tar.gz`, { type: dump.type })
        await dbManager.closeDbInstance(id)
        return fileToTarStreamFile(file, '/dbs')
      })
    )
  }
}

/**
 * Creates a stream of storage files (eg. CSVs) as tar file/directory entries.
 */
async function* createStorageStream(): AsyncIterable<TarStreamInput> {
  yield { type: 'directory', path: '/files' }

  for await (const { id, file } of listFiles()) {
    // Capture the ID by storing each file in a sub-dir
    // named after the ID
    yield { type: 'directory', path: `/files/${id}` }
    yield fileToTarStreamFile(file, `/files/${id}`)
  }
}
