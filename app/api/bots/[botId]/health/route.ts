import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkBotHealth, BotHealthStatus } from '@/lib/health/bot-health'

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
    .select('id, user_id, status, private_ip')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }

  if (bot.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (bot.status !== 'running') {
    const response: BotHealthStatus = {
      status: 'unreachable',
      gateway: false,
      moltbotService: 'inactive',
      lastChecked: new Date().toISOString(),
      error: `Bot is ${bot.status}`,
    }
    return NextResponse.json(response)
  }

  if (!bot.private_ip) {
    const response: BotHealthStatus = {
      status: 'unreachable',
      gateway: false,
      moltbotService: 'unknown',
      lastChecked: new Date().toISOString(),
      error: 'No private IP assigned',
    }
    return NextResponse.json(response)
  }

  const health = await checkBotHealth(bot.private_ip)
  return NextResponse.json(health)
}
