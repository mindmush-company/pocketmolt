import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/crypto/encryption'

interface ConfigureRequest {
  anthropicApiKey?: string
  openaiApiKey?: string
  telegramBotToken?: string
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

  const updateData: Record<string, string> = {}

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
    .select('id, encrypted_api_key, telegram_bot_token_encrypted')
    .eq('id', botId)
    .eq('user_id', user.id)
    .single()

  if (botError || !bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  return NextResponse.json({
    hasApiKey: bot.encrypted_api_key !== '',
    hasTelegramToken: bot.telegram_bot_token_encrypted !== '',
  })
}
