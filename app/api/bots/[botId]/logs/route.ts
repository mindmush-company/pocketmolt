import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface BotLogs {
  service: string[]
  init: string[]
  lastUpdated: string
  error?: string
}

const LOGS_TIMEOUT_MS = 5000

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
    const response: BotLogs = {
      service: [],
      init: [],
      lastUpdated: new Date().toISOString(),
      error: `Bot is ${bot.status} - logs unavailable`,
    }
    return NextResponse.json(response)
  }

  if (!bot.private_ip) {
    const response: BotLogs = {
      service: [],
      init: [],
      lastUpdated: new Date().toISOString(),
      error: 'No private IP assigned',
    }
    return NextResponse.json(response)
  }

  try {
    const logs = await fetchBotLogs(bot.private_ip)
    return NextResponse.json(logs)
  } catch (error) {
    const response: BotLogs = {
      service: [],
      init: [],
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch logs',
    }
    return NextResponse.json(response)
  }
}

async function fetchBotLogs(privateIp: string): Promise<BotLogs> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), LOGS_TIMEOUT_MS)

  try {
    const response = await fetch(`http://${privateIp}:18789/logs`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    return {
      service: data.service || [],
      init: data.init || [],
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Connection timeout')
    }
    throw error
  }
}
