import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  output: 'standalone',
  distDir: process.env.NIMI_NEXT_DIST_DIR || '.next',
  allowedDevOrigins: ['127.0.0.1'],
  outputFileTracingRoot: path.resolve(process.cwd(), '..'),
  turbopack: { root: path.resolve(process.cwd(), '..') },
  devIndicators: false,
}
export default nextConfig
