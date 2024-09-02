import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { Readable } from 'node:stream'

export async function decompressArchive(
  archiveStream: ReadableStream<Uint8Array>,
  outputDir: string
): Promise<void> {
  await mkdir(outputDir, { recursive: true })

  return new Promise((resolve, reject) => {
    // Spawn the tar process
    const tarProcess = spawn('tar', ['-xzf', '-', '-C', outputDir])

    // Pipe the .tar.gz file stream to tar's stdin
    // @ts-expect-error types are wrong
    Readable.fromWeb(archiveStream).pipe(tarProcess.stdin)

    // Handle errors
    tarProcess.on('error', (err) => {
      reject(new Error(`Failed to start tar process: ${err.message}`))
    })

    tarProcess.stdin.on('error', (err) => {
      reject(new Error(`Error in writing to tar stdin: ${err.message}`))
    })

    // Resolve the promise when the tar process completes successfully
    tarProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Tar process exited with code ${code}.`))
      }
    })
  })
}
