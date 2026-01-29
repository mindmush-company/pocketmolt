import { createAdminClient } from '../lib/supabase/admin'
import { encrypt } from '../lib/crypto/encryption'

const BOT_ID = 'ba33c1ad-6ff2-4f56-a3bf-83c44700c7ca'
const ANTHROPIC_API_KEY = process.env.DEFAULT_ANTHROPIC_API_KEY

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.error('DEFAULT_ANTHROPIC_API_KEY environment variable is required')
    process.exit(1)
  }

  const apiKeys = {
    anthropic: ANTHROPIC_API_KEY,
    openai: null,
  }
  const encrypted = encrypt(JSON.stringify(apiKeys))

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('bots')
    .update({ encrypted_api_key: encrypted })
    .eq('id', BOT_ID)

  if (error) {
    console.error('Failed to update bot:', error)
    process.exit(1)
  }

  console.log(`Updated bot ${BOT_ID} with API key`)
}

main()
