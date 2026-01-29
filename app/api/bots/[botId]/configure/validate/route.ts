import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { telegramTokenSchema } from '@/lib/validation/bot-config'

interface TelegramGetMeResponse {
  ok: boolean
  result?: {
    id: number
    is_bot: boolean
    first_name: string
    username: string
    can_join_groups?: boolean
    can_read_all_group_messages?: boolean
    supports_inline_queries?: boolean
  }
  description?: string
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
  const { telegramBotToken } = body

  if (!telegramBotToken) {
    return NextResponse.json(
      { error: 'Telegram bot token is required' },
      { status: 400 }
    )
  }

  const formatResult = telegramTokenSchema.safeParse(telegramBotToken)
  if (!formatResult.success) {
    return NextResponse.json(
      {
        valid: false,
        error: formatResult.error.issues[0].message,
      },
      { status: 200 }
    )
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/getMe`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const data: TelegramGetMeResponse = await response.json()

    if (!data.ok) {
      return NextResponse.json(
        {
          valid: false,
          error: data.description || 'Invalid token - Telegram rejected it',
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      valid: true,
      bot: {
        id: data.result!.id,
        username: data.result!.username,
        firstName: data.result!.first_name,
      },
    })
  } catch (error) {
    console.error('Telegram API error:', error)
    return NextResponse.json(
      {
        valid: false,
        error: 'Failed to verify token with Telegram. Please try again.',
      },
      { status: 200 }
    )
  }
}
