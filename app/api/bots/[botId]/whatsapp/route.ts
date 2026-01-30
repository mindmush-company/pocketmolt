import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    .select('id, user_id, status, private_ip, channel_type, whatsapp_connected_at')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  if (bot.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (bot.status !== 'running') {
    return NextResponse.json(
      {
        ready: false,
        error: `Bot must be running to pair WhatsApp. Current status: ${bot.status}`,
      },
      { status: 400 }
    )
  }

  if (!bot.private_ip) {
    return NextResponse.json(
      {
        ready: false,
        error: 'Bot has no private IP assigned yet. Please wait for provisioning to complete.',
      },
      { status: 400 }
    )
  }

  const host = request.headers.get('host') || 'localhost'
  const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'wss' : 'ws'
  const wsUrl = `${protocol}://${host}/ws/bots/${botId}/pair`

  return NextResponse.json({
    ready: true,
    wsUrl,
    channelType: bot.channel_type,
    whatsappConnectedAt: bot.whatsapp_connected_at,
  })
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
    .select('id, user_id')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  if (bot.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { action } = body

  if (action === 'mark_paired') {
    const { error: updateError } = await supabase
      .from('bots')
      .update({
        channel_type: 'whatsapp',
        whatsapp_connected_at: new Date().toISOString(),
        telegram_bot_token_encrypted: null,
      })
      .eq('id', botId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
