// `.from()` is expected by `@std/tar`
;(globalThis as any).ReadableStream.from ??= function <T>(
  iterator: Iterator<T> | AsyncIterator<T>
) {
  return new globalThis.ReadableStream<T>({
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

// Some browsers don't make `ReadableStream` async iterable (eg. Safari), so polyfill
globalThis.ReadableStream.prototype.values ??= function <T>({
  preventCancel = false,
} = {}): AsyncIterableIterator<T> {
  const reader = this.getReader()
  return {
    async next() {
      try {
        const { value, done } = await reader.read()
        if (done) {
          reader.releaseLock()
        }
        return { value, done }
      } catch (e) {
        reader.releaseLock()
        throw e
      }
    },
    async return(value) {
      if (!preventCancel) {
        const cancelPromise = reader.cancel(value)
        reader.releaseLock()
        await cancelPromise
      } else {
        reader.releaseLock()
      }
      return { done: true, value }
    },
    [Symbol.asyncIterator]() {
      return this
    },
  }
}

globalThis.ReadableStream.prototype[Symbol.asyncIterator] ??=
  globalThis.ReadableStream.prototype.values

// @std/tar conditionally uses `ReadableStreamBYOBReader` which isn't supported in Safari,
// so patch `ReadableStream`'s constructor to prevent using BYOB.
// Webpack's `ProvidePlugin` replaces `ReadableStream` references with this patch
export default class PatchedReadableStream<T> extends globalThis.ReadableStream<T> {
  constructor(underlyingSource?: UnderlyingSource<T>, strategy?: QueuingStrategy<T>) {
    if (underlyingSource?.type === 'bytes' && !('ReadableStreamBYOBReader' in globalThis)) {
      underlyingSource.type = undefined
    }
    super(underlyingSource, strategy)
  }
}
