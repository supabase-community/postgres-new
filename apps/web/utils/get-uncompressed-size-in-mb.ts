/**
 * Get the uncompressed size of a gzipped file in MB
 */
export async function getUncompressedSizeInMB(gzippedData: Blob | File): Promise<number> {
  // The last 4 bytes of the file contain the uncompressed size
  const arrayBuffer = await gzippedData.slice(-4).arrayBuffer()
  const view = new DataView(arrayBuffer)
  return view.getUint32(0, true) / (1024 * 1024)
}
