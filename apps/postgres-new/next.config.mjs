import { createRequire } from 'module'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

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
    /** @type {import('next/dist/lib/load-custom-routes.').Redirect[]} */
    const redirects = []

    // All postgres.new/* redirect to database.build/*, except postgres.new/export
    if (process.env.LEGACY_DOMAIN && process.env.CURRENT_DOMAIN) {
      redirects.push({
        source: '/:path((?!export$).*)',
        has: [
          {
            type: 'host',
            value: process.env.LEGACY_DOMAIN,
          },
        ],
        destination: `http://${process.env.CURRENT_DOMAIN}/:path`,
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
