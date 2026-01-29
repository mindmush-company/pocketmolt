#!/usr/bin/env npx tsx
/**
 * Debug script for investigating bot provisioning failures
 * Usage: pnpm tsx scripts/debug-bot.ts <botId>
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const HETZNER_API_TOKEN = process.env.HETZNER_API_TOKEN

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugBot(botId: string) {
  console.log(`\n========== Debugging Bot: ${botId} ==========\n`)

  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    console.error('Bot not found:', botError?.message || 'No data')
    return
  }

  console.log('📊 Bot Record:')
  console.log('  - Name:', bot.name)
  console.log('  - Status:', bot.status)
  console.log('  - Created:', bot.created_at)
  console.log('  - Hetzner Server ID:', bot.hetzner_server_id || '(none)')
  console.log('  - Private IP:', bot.private_ip || '(none)')
  console.log('  - Has API Key:', bot.encrypted_api_key ? 'Yes' : 'No')
  console.log('  - Has Telegram Token:', bot.telegram_bot_token_encrypted ? 'Yes' : 'No')
  console.log('  - Has Client Cert:', bot.client_cert ? 'Yes' : 'No')
  console.log('  - Setup Completed:', bot.setup_completed ?? false)

  if (bot.hetzner_server_id && HETZNER_API_TOKEN) {
    console.log('\n🖥️  Checking Hetzner Server...')
    try {
      const response = await fetch(
        `https://api.hetzner.cloud/v1/servers/${bot.hetzner_server_id}`,
        {
          headers: {
            Authorization: `Bearer ${HETZNER_API_TOKEN}`,
          },
        }
      )
      
      if (response.ok) {
        const { server } = await response.json()
        console.log('  - Server Status:', server.status)
        console.log('  - Server Name:', server.name)
        console.log('  - Public IP:', server.public_net?.ipv4?.ip || '(none)')
        console.log('  - Created:', server.created)
        console.log('  - Datacenter:', server.datacenter?.name)
      } else if (response.status === 404) {
        console.log('  ⚠️  Server NOT FOUND in Hetzner (may have been deleted during cleanup)')
      } else {
        console.log('  ❌ Failed to fetch server:', response.status, response.statusText)
      }
    } catch (e) {
      console.log('  ❌ Error checking Hetzner:', e)
    }
  } else if (!bot.hetzner_server_id) {
    console.log('\n🖥️  No Hetzner Server ID - provisioning likely failed before server creation')
  }

  if (HETZNER_API_TOKEN) {
    console.log('\n🔍 Searching for orphaned servers with bot_id label...')
    try {
      const response = await fetch(
        `https://api.hetzner.cloud/v1/servers?label_selector=bot_id=${botId}`,
        {
          headers: {
            Authorization: `Bearer ${HETZNER_API_TOKEN}`,
          },
        }
      )
      
      if (response.ok) {
        const { servers } = await response.json()
        if (servers.length > 0) {
          console.log(`  Found ${servers.length} server(s):`)
          for (const server of servers) {
            console.log(`    - ID: ${server.id}, Name: ${server.name}, Status: ${server.status}`)
          }
        } else {
          console.log('  No orphaned servers found')
        }
      }
    } catch (e) {
      console.log('  Error searching servers:', e)
    }
  }

  console.log('\n📋 Analysis:')
  
  if (bot.status === 'failed') {
    console.log('  Status is FAILED. Common causes:')
    if (!bot.hetzner_server_id) {
      console.log('    - Hetzner server creation failed (quota, image, location issue)')
      console.log('    - SSH key creation/retrieval failed')
      console.log('    - Certificate generation failed')
    } else if (!bot.private_ip) {
      console.log('    - Server created but network attachment failed')
      console.log('    - Private network may not exist or be misconfigured')
    } else {
      console.log('    - Server created and attached, but final status update failed')
    }
    console.log('\n  💡 Check backend logs with: docker logs pocketmolt-nextjs 2>&1 | grep', botId)
  } else if (bot.status === 'starting') {
    const createdAt = new Date(bot.created_at).getTime()
    const now = Date.now()
    const ageMinutes = Math.floor((now - createdAt) / 60000)
    
    if (ageMinutes > 10) {
      console.log(`  ⚠️  Bot has been "starting" for ${ageMinutes} minutes - likely stuck`)
      console.log('  Possible causes:')
      console.log('    - Provisioning process crashed/timed out')
      console.log('    - Webhook failed to trigger provisioning')
      console.log('    - Backend server was restarted during provisioning')
    } else {
      console.log(`  Bot is still starting (${ageMinutes} min old) - may still be provisioning`)
    }
  } else if (bot.status === 'running') {
    console.log('  Bot appears to be running normally')
    if (!bot.private_ip) {
      console.log('  ⚠️  But missing private IP - health checks will fail')
    }
  }

  console.log('\n========================================\n')
}

const botId = process.argv[2]
if (!botId) {
  console.error('Usage: pnpm tsx scripts/debug-bot.ts <botId>')
  process.exit(1)
}

debugBot(botId).catch(console.error)
