import { FeatureExtractionPipelineOptions, pipeline } from '@xenova/transformers'
import * as Comlink from 'comlink'

const embedPromise = pipeline('feature-extraction', 'supabase/gte-small', {
  quantized: true,
})

export async function embed(
  texts: string[],
  options?: FeatureExtractionPipelineOptions
): Promise<number[][]> {
  const embedFn = await embedPromise
  const tensor = await embedFn(texts, options)
  return tensor.tolist()
}

Comlink.expose(embed)
