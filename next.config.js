/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  // Enable build cache
  experimental: {
    turbotrace: {
      memoryLimit: 4000
    },
    // Enable more aggressive caching
    incrementalCacheHandlerPath: require.resolve('./cache-handler.js'),
    isrMemoryCacheSize: 0 // Disable ISR memory cache
  }
}

module.exports = nextConfig 