import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto/encryption'
import { botConfigSchema } from '@/lib/validation/bot-config'

interface ConfigureRequest {
  anthropicApiKey?: string
  openaiApiKey?: string
  telegramBotToken?: string
  channelType?: 'telegram' | 'whatsapp' | 'none'
  botEmoji?: string
  botTheme?: string
  primaryModel?: string
  dmPolicy?: 'pairing' | 'allowlist' | 'open'
  allowFrom?: string[]
  setupCompleted?: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const { botId } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('id, user_id, status')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  if (bot.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body: ConfigureRequest = await request.json()

  const updateData: Record<string, string | boolean | string[] | null> = {}

  if (body.anthropicApiKey) {
    const apiKeys = {
      anthropic: body.anthropicApiKey,
      openai: body.openaiApiKey || null,
    }
    updateData.encrypted_api_key = encrypt(JSON.stringify(apiKeys))
  }

  if (body.telegramBotToken) {
    updateData.telegram_bot_token_encrypted = encrypt(body.telegramBotToken)
  }

  if (body.botEmoji !== undefined) {
    updateData.bot_emoji = body.botEmoji
  }

  if (body.botTheme !== undefined) {
    updateData.bot_theme = body.botTheme
  }

  if (body.primaryModel !== undefined) {
    updateData.primary_model = body.primaryModel
  }

  if (body.dmPolicy !== undefined) {
    updateData.dm_policy = body.dmPolicy
  }

  if (body.allowFrom !== undefined) {
    updateData.allow_from = body.allowFrom
  }

  if (body.channelType !== undefined) {
    updateData.channel_type = body.channelType
  }

  if (body.setupCompleted !== undefined) {
    updateData.setup_completed = body.setupCompleted
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No configuration provided' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminSupabase = createAdminClient() as any
  const { error: updateError } = await adminSupabase
    .from('bots')
    .update(updateData)
    .eq('id', botId)

  if (updateError) {
    console.error('Failed to update bot configuration:', updateError)
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Configuration saved successfully',
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const { botId } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('id, encrypted_api_key, telegram_bot_token_encrypted, bot_emoji, bot_theme, primary_model, dm_policy, allow_from, setup_completed, channel_type, whatsapp_connected_at')
    .eq('id', botId)
    .eq('user_id', user.id)
    .single()

  if (botError || !bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  return NextResponse.json({
    hasApiKey: bot.encrypted_api_key !== '' && bot.encrypted_api_key !== null,
    hasTelegramToken: bot.telegram_bot_token_encrypted !== '' && bot.telegram_bot_token_encrypted !== null,
    botEmoji: bot.bot_emoji ?? '🤖',
    botTheme: bot.bot_theme ?? 'helpful',
    primaryModel: bot.primary_model ?? 'anthropic/claude-sonnet-4-20250514',
    dmPolicy: bot.dm_policy ?? 'pairing',
    allowFrom: bot.allow_from ?? [],
    setupCompleted: bot.setup_completed ?? false,
    channelType: bot.channel_type ?? 'telegram',
    whatsappConnectedAt: bot.whatsapp_connected_at,
  })
}
