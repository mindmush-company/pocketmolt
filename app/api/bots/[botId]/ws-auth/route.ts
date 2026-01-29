import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
    return new NextResponse(null, { status: 401 })
  }

  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('id, user_id, status, private_ip')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    return new NextResponse(null, { status: 404 })
  }

  if (bot.user_id !== user.id) {
    return new NextResponse(null, { status: 403 })
  }

  if (bot.status !== 'running' || !bot.private_ip) {
    return new NextResponse(null, { status: 503 })
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Bot-Private-IP': bot.private_ip,
    },
  })
}
