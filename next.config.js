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
    }
  }
}

module.exports = nextConfig 