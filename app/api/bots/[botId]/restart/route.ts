import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hetzner } from '@/lib/hetzner'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const { botId } = await params

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single()

    if (botError || !bot) {
      return NextResponse.json({ error: 'Bot not found or access denied' }, { status: 404 })
    }

    if (bot.status !== 'running') {
      return NextResponse.json({ error: `Cannot restart bot in '${bot.status}' state` }, { status: 400 })
    }

    if (!bot.hetzner_server_id) {
      return NextResponse.json({ error: 'Bot has no associated server' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('bots')
      .update({ status: 'starting' })
      .eq('id', botId)

    if (updateError) {
      console.error('Failed to update bot status:', updateError)
      return NextResponse.json({ error: 'Failed to update bot status' }, { status: 500 })
    }

    await hetzner.servers.reboot(bot.hetzner_server_id)

    try {
      await hetzner.servers.waitForRunning(bot.hetzner_server_id, {
        timeoutMs: 60000,
        intervalMs: 2000,
      })

      await supabase.from('bots').update({ status: 'running' }).eq('id', botId)
    } catch (e) {
      console.warn('Timed out waiting for server to restart, leaving as starting', e)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Restart bot error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
