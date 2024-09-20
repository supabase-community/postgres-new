// `.from()` is expected by `@std/tar`
;(ReadableStream as any).from ??= function <T>(iterator: Iterator<T> | AsyncIterator<T>) {
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

// Some browsers don't yet make `ReadableStream` async iterable (eg. Safari), so polyfill
ReadableStream.prototype.values ??= function <T>({
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

ReadableStream.prototype[Symbol.asyncIterator] ??= ReadableStream.prototype.values
