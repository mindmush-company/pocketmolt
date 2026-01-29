import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto/encryption'
import { proxyToBot, rewriteHtmlForProxy, getContentType } from '@/lib/bot-proxy'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string; path?: string[] }> }
) {
  const { botId, path: pathSegments } = await params
  const proxyPath = pathSegments ? '/' + pathSegments.join('/') : '/'

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
    .select('id, user_id, status, private_ip, gateway_token_encrypted')
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
      { error: `Bot is ${bot.status}, cannot access UI` },
      { status: 503 }
    )
  }

  if (!bot.private_ip) {
    return NextResponse.json(
      { error: 'Bot has no private IP assigned' },
      { status: 503 }
    )
  }

  try {
    const gatewayToken = bot.gateway_token_encrypted
      ? decrypt(bot.gateway_token_encrypted)
      : ''

    // Fetch HTML with token in query string so Control UI reads it
    const fetchPath = proxyPath === '/' ? `/?token=${encodeURIComponent(gatewayToken)}` : proxyPath
    const result = await proxyToBot(bot.private_ip, fetchPath)

    const contentType = result.headers['content-type'] || ''
    if (contentType.includes('text/html') || proxyPath === '/') {
      const modifiedHtml = rewriteHtmlForProxy(
        result.body.toString('utf-8'),
        botId,
        gatewayToken
      )

      return new NextResponse(modifiedHtml, {
        status: result.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Frame-Options': 'SAMEORIGIN',
          'Cache-Control': 'no-store',
        },
      })
    }

    const isAsset = proxyPath.startsWith('/assets/')
    return new NextResponse(new Uint8Array(result.body), {
      status: result.status,
      headers: {
        'Content-Type': getContentType(proxyPath),
        'Cache-Control': isAsset
          ? 'public, max-age=31536000, immutable'
          : 'no-store',
      },
    })
  } catch (error) {
    console.error(`UI proxy error for bot ${botId}:`, error)
    return NextResponse.json(
      { error: 'Failed to connect to bot UI' },
      { status: 502 }
    )
  }
}
