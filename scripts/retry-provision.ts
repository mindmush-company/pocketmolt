#!/usr/bin/env npx tsx
/**
 * Retry provisioning for a failed bot
 * Usage: pnpm tsx scripts/retry-provision.ts <botId>
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const PROVISION_SECRET = process.env.PROVISION_API_SECRET

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE environment variables')
  process.exit(1)
}

if (!PROVISION_SECRET) {
  console.error('Missing PROVISION_API_SECRET environment variable')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function retryProvision(botId: string) {
  console.log(`\nRetrying provisioning for bot: ${botId}\n`)

  const { data: bot, error: fetchError } = await supabase
    .from('bots')
    .select('id, name, status')
    .eq('id', botId)
    .single()

  if (fetchError || !bot) {
    console.error('Bot not found:', fetchError?.message || 'No data')
    process.exit(1)
  }

  console.log(`Bot: ${bot.name} (status: ${bot.status})`)

  if (bot.status !== 'failed' && bot.status !== 'stopped') {
    console.error(`Bot must be in 'failed' or 'stopped' status to retry (current: ${bot.status})`)
    process.exit(1)
  }

  console.log('Resetting bot status to "starting"...')
  const { error: updateError } = await supabase
    .from('bots')
    .update({ status: 'starting', hetzner_server_id: null, private_ip: null })
    .eq('id', botId)

  if (updateError) {
    console.error('Failed to reset bot status:', updateError.message)
    process.exit(1)
  }

  console.log('Triggering provisioning...')
  const response = await fetch(`${APP_URL}/api/provision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-provision-secret': PROVISION_SECRET!,
    },
    body: JSON.stringify({ botId }),
  })

  const result = await response.json()

  if (response.ok) {
    console.log('\n✅ Provisioning successful!')
    console.log(`  Server ID: ${result.serverId}`)
    console.log(`  Server IP: ${result.serverIp}`)
  } else {
    console.error('\n❌ Provisioning failed:', result.error)
    process.exit(1)
  }
}

const botId = process.argv[2]
if (!botId) {
  console.error('Usage: pnpm tsx scripts/retry-provision.ts <botId>')
  process.exit(1)
}

retryProvision(botId).catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
