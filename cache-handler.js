const fs = require('fs')
const path = require('path')

module.exports = class CacheHandler {
  constructor(options) {
    this.options = options
    this.cache = new Map()
  }

  async get(key) {
    const cached = this.cache.get(key)
    if (cached) return cached

    const cacheDir = path.join('.next', 'cache')
    const cacheFile = path.join(cacheDir, `${key}.json`)

    try {
      if (!fs.existsSync(cacheFile)) return null
      const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
      this.cache.set(key, data)
      return data
    } catch (error) {
      return null
    }
  }

  async set(key, data) {
    this.cache.set(key, data)
    const cacheDir = path.join('.next', 'cache')
    const cacheFile = path.join(cacheDir, `${key}.json`)

    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true })
      }
      fs.writeFileSync(cacheFile, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to write cache:', error)
    }
  }
} 