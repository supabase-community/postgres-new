declare interface ReadableStream<R = any> extends AsyncIterable<R> {
  values(options?: ReadableStreamIteratorOptions): AsyncIterator<R>
  [Symbol.asyncIterator](options?: ReadableStreamIteratorOptions): AsyncIterator<R>
}
