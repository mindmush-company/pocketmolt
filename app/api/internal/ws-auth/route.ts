import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const botId = request.headers.get('x-bot-id')
  
  if (!botId) {
    return new NextResponse('Missing bot ID', { status: 400 })
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(botId)) {
    return new NextResponse('Invalid bot ID', { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: bot, error: botError } = await adminClient
    .from('bots')
    .select('id, user_id, private_ip, status')
    .eq('id', botId)
    .single()

  if (botError || !bot) {
    return new NextResponse('Bot not found', { status: 404 })
  }

  if (bot.user_id !== user.id) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (!bot.private_ip) {
    return new NextResponse('Bot not provisioned', { status: 503 })
  }

  if (bot.status !== 'running') {
    return new NextResponse('Bot not running', { status: 503 })
  }

  return new NextResponse('OK', {
    status: 200,
    headers: {
      'X-Bot-Private-IP': bot.private_ip,
    },
  })
}
