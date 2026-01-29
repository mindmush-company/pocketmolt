import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface BotListItem {
  id: string
  name: string
  status: 'starting' | 'running' | 'stopped' | 'failed'
  hasTelegramToken: boolean
  setupCompleted: boolean
  botEmoji: string | null
  createdAt: string
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: bots, error: botsError } = await supabase
    .from('bots')
    .select('id, name, status, telegram_bot_token_encrypted, setup_completed, bot_emoji, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (botsError) {
    console.error('Failed to fetch bots:', botsError)
    return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 })
  }

  // Transform to lightweight response (no encrypted fields)
  const botList: BotListItem[] = (bots || []).map((bot) => ({
    id: bot.id,
    name: bot.name,
    status: bot.status as BotListItem['status'],
    hasTelegramToken: bot.telegram_bot_token_encrypted !== '',
    setupCompleted: bot.setup_completed ?? false,
    botEmoji: bot.bot_emoji,
    createdAt: bot.created_at,
  }))

  return NextResponse.json({ bots: botList })
}
