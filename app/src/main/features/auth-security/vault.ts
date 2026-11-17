import { constants } from 'node:fs'
import { mkdir, open, rename, unlink, lstat, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { credentialsSchema, type Credentials, type Vault } from './core'

export interface Encryption {
  isEncryptionAvailable(): boolean
  getSelectedStorageBackend?(): string
  encryptString(value: string): Buffer
  decryptString(value: Buffer): string
}
/** Dedicated directory; no plaintext files, no credential-read IPC API. */
export class EncryptedVault implements Vault {
  private directory: string
  private file: string
  constructor(userData: string, private encryption: Encryption, private platform = process.platform) {
    this.directory = join(userData, 'auth-security')
    this.file = join(this.directory, 'session.enc')
  }
  available(): boolean {
    try {
      if (!this.encryption.isEncryptionAvailable()) return false
      if (this.platform === 'linux') {
        const backend = this.encryption.getSelectedStorageBackend?.()
        return !!backend && ['gnome_libsecret', 'kwallet', 'kwallet5', 'kwallet6'].includes(backend)
      }
      return true
    } catch { return false }
  }
  private requireEncryption(): void {
    if (!this.available()) throw new Error('Credential storage unavailable')
  }
  private async prepare(): Promise<void> {
    await mkdir(this.directory, { mode: 0o700, recursive: true })
    const info = await lstat(this.directory)
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Credential storage unavailable')
    await chmod(this.directory, 0o700)
  }
  async read(): Promise<Credentials | null> {
    this.requireEncryption()
    try {
      await this.prepare()
      const entry = await lstat(this.file)
      if (!entry.isFile() || entry.isSymbolicLink()) throw new Error('unsafe')
      const handle = await open(this.file, constants.O_RDONLY | constants.O_NOFOLLOW)
      try {
        const info = await handle.stat()
        if (!info.isFile() || info.size > 65_536 || (this.platform !== 'win32' && (info.mode & 0o077))) {
          throw new Error('unsafe')
        }
        const ciphertext = await handle.readFile()
        return credentialsSchema.parse(JSON.parse(this.encryption.decryptString(ciphertext)))
      } finally { await handle.close() }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw new Error('Credential storage unavailable')
    }
  }
  async write(value: Credentials): Promise<void> {
    this.requireEncryption()
    let temporary: string | undefined
    try {
      const plaintext = JSON.stringify(credentialsSchema.parse(value))
      const ciphertext = this.encryption.encryptString(plaintext)
      if (ciphertext.byteLength > 65_536) throw new Error('oversized')
      await this.prepare()
      temporary = join(this.directory, `pending-${randomBytes(16).toString('hex')}.enc`)
      const handle = await open(temporary, 'wx', 0o600)
      try { await handle.writeFile(ciphertext); await handle.sync() } finally { await handle.close() }
      await rename(temporary, this.file)
      temporary = undefined
    } catch { throw new Error('Credential storage unavailable') } finally {
      if (temporary) await unlink(temporary).catch(() => undefined)
    }
  }
  async clear(): Promise<void> {
    try { await unlink(this.file) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Credential storage unavailable')
    }
  }
}
