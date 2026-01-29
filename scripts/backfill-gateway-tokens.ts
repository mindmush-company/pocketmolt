import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import 'dotenv/config'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

function encrypt(plaintext: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: bots, error } = await supabase
    .from('bots')
    .select('id, name, status, hetzner_server_id, private_ip, gateway_token_encrypted')
    .is('gateway_token_encrypted', null)
    .eq('status', 'running')

  if (error) {
    console.error('Failed to fetch bots:', error)
    process.exit(1)
  }

  console.log(`Found ${bots?.length || 0} bots without gateway tokens`)

  for (const bot of bots || []) {
    console.log(`\nProcessing bot ${bot.id} (${bot.name})...`)

    const gatewayToken = crypto.randomBytes(32).toString('hex')
    const encrypted = encrypt(gatewayToken)

    const { error: updateError } = await supabase
      .from('bots')
      .update({ gateway_token_encrypted: encrypted })
      .eq('id', bot.id)

    if (updateError) {
      console.error(`Failed to update bot ${bot.id}:`, updateError)
      continue
    }

    console.log(`  ✓ Stored encrypted token in database`)
    console.log(`  ⚠ Bot server not updated - restart bot from dashboard to apply`)
  }

  console.log('\nDone!')
}

main().catch(console.error)
