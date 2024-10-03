import { createRequire } from 'module'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import webpack from 'webpack'

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_PGLITE_VERSION: await getPackageVersion('@electric-sql/pglite'),
  },
  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      fallback: {
        fs: false,
        module: false,
        'stream/promises': false,
      },
    }

    // Polyfill `ReadableStream`
    config.plugins.push(
      new webpack.ProvidePlugin({
        ReadableStream: [join(import.meta.dirname, 'polyfills/readable-stream.ts'), 'default'],
      })
    )

    // See https://webpack.js.org/configuration/resolve/#resolvealias
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false,
    }
    return config
  },
  swcMinify: false,
  async redirects() {
    /** @type {import('next/dist/lib/load-custom-routes').Redirect[]} */
    const redirects = []

    // All postgres.new/* redirect to database.build/*, except postgres.new/export
    if (
      process.env.REDIRECT_LEGACY_DOMAIN === 'true' &&
      process.env.NEXT_PUBLIC_LEGACY_DOMAIN &&
      process.env.NEXT_PUBLIC_CURRENT_DOMAIN
    ) {
      const legacyHostname = new URL(process.env.NEXT_PUBLIC_LEGACY_DOMAIN).hostname

      redirects.push({
        source: '/:path((?!export$).*)',
        has: [
          {
            type: 'host',
            value: legacyHostname,
          },
        ],
        destination: `${process.env.NEXT_PUBLIC_CURRENT_DOMAIN}/:path?from=${legacyHostname}`,
        permanent: false,
      })
    }

    return redirects
  },
}

export default nextConfig

async function getPackageJson(module) {
  const require = createRequire(import.meta.url)
  const entryPoint = require.resolve(module)
  const [nodeModulePath] = entryPoint.split(module)

  const packagePath = join(nodeModulePath, module, 'package.json')
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))

  return packageJson
}

async function getPackageVersion(module) {
  const packageJson = await getPackageJson(module)
  return packageJson.version
}
