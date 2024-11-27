import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('sw.ts', import.meta.url)),
      fileName: 'sw',
      formats: ['es'],
    },
    outDir: fileURLToPath(new URL('public', import.meta.url)),
    emptyOutDir: false,
    copyPublicDir: false,
  },
})
