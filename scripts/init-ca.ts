import 'dotenv/config'
import { generateCACertificate, generateServerCertificate } from '../lib/crypto/certificates'
import { encrypt } from '../lib/crypto/encryption'
import { createAdminClient } from '../lib/supabase/admin'

const BACKEND_HOSTNAME = 'pocketmolt-backend.internal'
const BACKEND_PRIVATE_IP = '10.0.0.2'

async function initializeCA() {
  console.log('Generating CA certificate...')
  const ca = generateCACertificate()

  console.log('Generating server certificate...')
  const server = generateServerCertificate(
    BACKEND_HOSTNAME,
    BACKEND_PRIVATE_IP,
    ca.certificate,
    ca.privateKey
  )

  const caKeyEncrypted = encrypt(ca.privateKey)
  const serverKeyEncrypted = encrypt(server.privateKey)

  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 10)

  console.log('Storing in database...')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  await supabase
    .from('pocketmolt_ca')
    .update({ is_active: false })
    .eq('is_active', true)

  const { error } = await supabase
    .from('pocketmolt_ca')
    .insert({
      ca_cert: ca.certificate,
      ca_key_encrypted: caKeyEncrypted,
      server_cert: server.certificate,
      server_key_encrypted: serverKeyEncrypted,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })

  if (error) {
    console.error('Failed to store CA:', error)
    process.exit(1)
  }

  console.log('CA initialized successfully!')
  console.log('CA Certificate (for distribution to bots):')
  console.log(ca.certificate)
}

initializeCA().catch(console.error)
