import { ServerResponse } from 'http'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto/encryption'
import { MTLSRequest } from '@/lib/mtls-server'
import { BACKEND_IP } from '@/lib/provisioning/network'

const LITELLM_PROXY_PORT = 4000

interface MoltBotConfig {
  agent: {
    model: string
  }
  channels: {
    telegram?: {
      botToken: string
    }
  }
  proxy?: {
    baseUrl: string
    apiKey: string
  }
  apiKeys: {
    anthropic?: string
    openai?: string | null
  }
  gatewayToken?: string
}

export async function handleConfigRequest(
  req: MTLSRequest,
  res: ServerResponse
): Promise<void> {
  const botId = req.botId

  if (!botId) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  if (req.method !== 'GET' || req.url !== '/config') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, encrypted_api_key, telegram_bot_token_encrypted, private_ip, gateway_token_encrypted, litellm_key_encrypted, primary_model')
      .eq('id', botId)
      .single()

    if (error || !bot) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Bot not found' }))
      return
    }

    const config: MoltBotConfig = {
      agent: {
        model: bot.primary_model || 'anthropic/claude-sonnet-4-20250514',
      },
      channels: {},
      apiKeys: {},
    }

    if (bot.litellm_key_encrypted) {
      config.proxy = {
        baseUrl: `http://${BACKEND_IP}:${LITELLM_PROXY_PORT}`,
        apiKey: decrypt(bot.litellm_key_encrypted),
      }
    } else if (bot.encrypted_api_key) {
      try {
        const apiKeys = JSON.parse(decrypt(bot.encrypted_api_key))
        config.apiKeys = apiKeys
      } catch {
        config.apiKeys.anthropic = decrypt(bot.encrypted_api_key)
      }
    }

    if (bot.telegram_bot_token_encrypted) {
      config.channels.telegram = {
        botToken: decrypt(bot.telegram_bot_token_encrypted),
      }
    }

    if (bot.gateway_token_encrypted) {
      config.gatewayToken = decrypt(bot.gateway_token_encrypted)
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(config))

    console.log(`Config delivered to bot ${botId}`)
  } catch (error) {
    console.error(`Failed to deliver config to bot ${botId}:`, error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}
