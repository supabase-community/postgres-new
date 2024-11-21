import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'sw.ts'),
      fileName: 'sw',
      formats: ['es'],
    },
    outDir: resolve(__dirname, 'public'),
    emptyOutDir: false,
    copyPublicDir: false,
  },
})
