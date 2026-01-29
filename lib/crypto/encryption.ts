import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    )
  }
  return Buffer.from(keyHex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const authTag = cipher.getAuthTag()

  const combined = Buffer.concat([iv, authTag, encrypted])

  return combined.toString('base64')
}

export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedBase64, 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64')
    return decoded.length > IV_LENGTH + TAG_LENGTH
  } catch {
    return false
  }
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
