import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { provisionServer } from '@/lib/provisioning/server'

const PROVISION_SECRET = process.env.PROVISION_API_SECRET

interface BotRecord {
  id: string
  name: string
  user_id: string
  status: string
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-provision-secret')
  if (!PROVISION_SECRET || authHeader !== PROVISION_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  let body: { botId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { botId } = body

  if (!botId || typeof botId !== 'string') {
    return NextResponse.json(
      { error: 'botId is required' },
      { status: 400 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data, error: fetchError } = await supabase
    .from('bots')
    .select('id, name, user_id, status')
    .eq('id', botId)
    .single()

  const bot = data as BotRecord | null

  if (fetchError || !bot) {
    return NextResponse.json(
      { error: 'Bot not found' },
      { status: 404 }
    )
  }

  if (bot.status !== 'starting') {
    return NextResponse.json(
      { error: `Bot is not in starting state (current: ${bot.status})` },
      { status: 400 }
    )
  }

  const result = await provisionServer(bot.id, bot.name, bot.user_id)

  if (result.success) {
    return NextResponse.json({
      success: true,
      serverId: result.serverId,
      serverIp: result.serverIp,
    })
  }

  return NextResponse.json(
    { error: result.error || 'Provisioning failed' },
    { status: 500 }
  )
}
