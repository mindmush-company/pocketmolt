import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface LiteLLMSpendEvent {
  call_type: string
  api_key: string
  spend: number
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  model: string
  user: string
  metadata?: {
    bot_id?: string
    user_id?: string
  }
  startTime: string
  endTime: string
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.LITELLM_WEBHOOK_SECRET

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event: LiteLLMSpendEvent = await request.json()

  const botId = event.metadata?.bot_id
  const userId = event.metadata?.user_id

  if (!botId || !userId) {
    return NextResponse.json({ error: 'Missing bot_id or user_id in metadata' }, { status: 400 })
  }

  const costCents = Math.ceil(event.spend * 100)

  const adminSupabase = createAdminClient()

  const { error: logError } = await adminSupabase.from('usage_log').insert({
    user_id: userId,
    bot_id: botId,
    model: event.model,
    input_tokens: event.prompt_tokens,
    output_tokens: event.completion_tokens,
    cost_cents: costCents,
  })

  if (logError) {
    console.error('Failed to log usage:', logError)
    return NextResponse.json({ error: 'Failed to log usage' }, { status: 500 })
  }

  const { error: creditError } = await adminSupabase.rpc('increment_lifetime_usage', {
    p_user_id: userId,
    p_amount: costCents,
  })

  if (creditError) {
    console.error('Failed to update credits:', creditError)
  }

  return NextResponse.json({ success: true })
}
