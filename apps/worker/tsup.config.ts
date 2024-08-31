import { defineConfig, type Options } from 'tsup'
import fs from 'node:fs/promises'
import path from 'node:path'

export default defineConfig({
  entry: ['src/index.ts'],
  bundle: true,
  format: ['esm'],
  target: 'esnext',
  outDir: 'dist',
  esbuildPlugins: [pglitePlugin({ outDir: 'dist', extensions: ['vector'] })],
  skipNodeModulesBundle: true,
  clean: true,
  platform: 'node',
  minify: true,
  noExternal: [/(.*)/],
  splitting: false,
})

function pglitePlugin(options?: {
  outDir: string
  extensions?: Array<string>
}): NonNullable<Options['esbuildPlugins']>[number] {
  return {
    name: 'static-file-loader',
    setup(build) {
      build.onLoad({ filter: /@electric-sql\/pglite\/dist\/vector\/index.js/ }, async (args) => {
        let source = await fs.readFile(args.path, 'utf8')
        source = source.replace('..//vector.tar.gz', 'vector.tar.gz')
        return {
          contents: source,
        }
      })
      build.onEnd(async () => {
        const pglitePath = new URL(path.dirname(import.meta.resolve('@electric-sql/pglite')))
          .pathname
        if (options?.outDir) {
          await fs.mkdir(options.outDir, { recursive: true })
          await fs.copyFile(
            path.join(pglitePath, 'postgres.data'),
            path.join(options.outDir, 'postgres.data')
          )
          await fs.copyFile(
            path.join(pglitePath, 'postgres.wasm'),
            path.join(options.outDir, 'postgres.wasm')
          )
          if (options.extensions) {
            for (const extension of options.extensions) {
              await fs.copyFile(
                path.join(pglitePath, `${extension}.tar.gz`),
                path.join(options.outDir, `${extension}.tar.gz`)
              )
            }
          }
        }
      })
    },
  }
}
