import { FeatureExtractionPipelineOptions } from '@xenova/transformers'
import * as Comlink from 'comlink'

type EmbedFn = (typeof import('./worker.ts'))['embed']

let embedFn: EmbedFn

// Wrap embed function in WebWorker via comlink
function getEmbedFn() {
  if (embedFn) {
    return embedFn
  }

  if (typeof window === 'undefined') {
    throw new Error('Embed function only available in the browser')
  }

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  embedFn = Comlink.wrap<EmbedFn>(worker)
  return embedFn
}

/**
 * Generates an embedding for each text in `texts`.
 *
 * @returns An array of vectors.
 */
export async function embed(texts: string[], options?: FeatureExtractionPipelineOptions) {
  const embedFn = getEmbedFn()
  return await embedFn(texts, options)
}
