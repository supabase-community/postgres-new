import { TarStreamFile } from '@std/tar/tar-stream'
import { TarStreamEntry } from '@std/tar/untar-stream'

export type AnyIterable<T> = Iterable<T> | AsyncIterable<T>

export async function* mergeIterables<T>(iterables: AnyIterable<AnyIterable<T>>): AsyncIterable<T> {
  for await (const iterable of iterables) {
    yield* iterable
  }
}

export function makeAsyncIterable<T>(iterator: AsyncIterator<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      return iterator
    },
  }
}

/**
 * Waits for a chunk in an `AsyncIterable` stream matching the `predicate`
 * function, then returns the chunk along with the rest of the stream.
 *
 * All chunks that arrive before the desired chunk get buffered in memory.
 * These are then re-yielded along with the remaining chunks.
 *
 * If the desired chunk was never found, `undefined` is returned in the tuple.
 */
export async function waitForChunk<T>(
  stream: AsyncIterable<T>,
  predicate: (chunk: T) => boolean
): Promise<[chunk: T | undefined, rest: AsyncIterable<T>]> {
  const iterator = stream[Symbol.asyncIterator]()
  const iterable = makeAsyncIterable(iterator)

  const buffer: T[] = []

  while (true) {
    const { value, done } = await iterator.next()
    if (done) break

    if (predicate(value)) {
      return [value, mergeIterables([buffer, iterable])]
    }

    buffer.push(value)
  }

  return [undefined, mergeIterables([buffer, iterable])]
}

/**
 * Converts a `File` into a `TarStreamFile`.
 */
export async function fileToTarStreamFile(file: File, path?: string): Promise<TarStreamFile> {
  return {
    type: 'file',
    path: path ? `${path}/${file.name}` : file.name,
    size: file.size,
    readable: file.stream(),
  }
}

/**
 * Converts a `TarStreamEntry` into a `File`.
 */
export async function tarStreamEntryToFile(tarStreamEntry: TarStreamEntry): Promise<File> {
  if (tarStreamEntry.header.typeflag !== '0') {
    throw new Error('Tar stream entry is not a file')
  }

  if (!tarStreamEntry.readable) {
    throw new Error('Tar stream entry is a file, but has no readable stream')
  }

  const fileName = tarStreamEntry.path.split('/').at(-1)!

  return await fileFromStream(tarStreamEntry.readable, fileName)
}

/**
 * Generates a `Blob` from a `ReadableStream<Uint8Array>`.
 */
export async function blobFromStream(stream: ReadableStream<Uint8Array>) {
  const response = new Response(stream)
  return await response.blob()
}

/**
 * Generates a `File` from a `ReadableStream<Uint8Array>`.
 */
export async function fileFromStream(
  stream: ReadableStream<Uint8Array>,
  fileName: string,
  options?: FilePropertyBag
) {
  const blob = await blobFromStream(stream)
  return new File([blob], fileName, options)
}

/**
 * Generates a `TransformStream` from a transform function.
 *
 * The function can be sync or async, and it's return value
 * represents the transformed value.
 */
export function transformStreamFromFn<I, O>(
  transform: (input: I) => O | Promise<O | undefined> | undefined
) {
  return new TransformStream<I, O>({
    async transform(chunk, controller) {
      try {
        const output = await transform(chunk)
        if (output) {
          controller.enqueue(output)
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

/**
 * Generates a `ReadableStream` from an `Iterable` or `AsyncIterable`.
 *
 * Useful for converting generator functions into readable streams.
 */
export function readableStreamFromIterable<T>(iterable: AnyIterable<T>) {
  const iterator =
    Symbol.asyncIterator in iterable
      ? iterable[Symbol.asyncIterator]()
      : iterable[Symbol.iterator]()

  return new ReadableStream<T>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
