const { readFileSync } = require('node:fs')
const { join } = require('node:path')
try {
  const lock = JSON.parse(readFileSync(join(__dirname, '..', 'package-lock.json'), 'utf8'))
  for (const entry of Object.values(lock.packages || {})) {
    if (!entry.resolved) continue
    const url = new URL(entry.resolved)
    if (url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org' || url.username || url.password) {
      throw new Error('Nonportable package source')
    }
  }
  console.log('Dependency lock portability check passed')
} catch {
  console.error('Dependency lock is invalid or contains an environment-only source. Regenerate with the project npm configuration; preserve versions and integrity.')
  process.exitCode = 1
}
