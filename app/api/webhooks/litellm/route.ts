import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * LiteLLM StandardLoggingPayload (partial)
 * @see https://docs.litellm.ai/docs/proxy/logging_spec
 */
interface StandardLoggingPayload {
  id: string
  call_type: string
  response_cost: number
  total_tokens: number
  prompt_tokens: number
  completion_tokens: number
  model: string
  status: string
  startTime: number
  endTime: number
  metadata?: {
    user_api_key_hash?: string
    user_api_key_alias?: string
    user_api_key_user_id?: string
    spend_logs_metadata?: {
      bot_id?: string
      user_id?: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payloads: StandardLoggingPayload[] = Array.isArray(body) ? body : [body]
    
    if (payloads.length === 0) {
      return NextResponse.json({ success: true, message: 'No payloads to process' })
    }

    const adminSupabase = createAdminClient()
    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (const payload of payloads) {
      try {
        const botId = payload.metadata?.spend_logs_metadata?.bot_id
        const userId = payload.metadata?.spend_logs_metadata?.user_id

        if (!botId || !userId) {
          const keyHash = payload.metadata?.user_api_key_hash
          if (keyHash) {
            console.warn(`Missing bot_id/user_id in metadata, key hash: ${keyHash}`)
          }
          results.failed++
          results.errors.push(`Missing bot_id or user_id in payload ${payload.id}`)
          continue
        }

        if (payload.status !== 'success') {
          continue
        }

        const costCents = Math.ceil(payload.response_cost * 100)

        const { error: logError } = await adminSupabase.from('usage_log').insert({
          user_id: userId,
          bot_id: botId,
          model: payload.model,
          input_tokens: payload.prompt_tokens,
          output_tokens: payload.completion_tokens,
          cost_cents: costCents,
        })

        if (logError) {
          console.error('Failed to log usage:', logError)
          results.failed++
          results.errors.push(`DB insert failed for ${payload.id}: ${logError.message}`)
          continue
        }

        const { error: creditError } = await adminSupabase.rpc('increment_lifetime_usage', {
          p_user_id: userId,
          p_amount: costCents,
        })

        if (creditError) {
          console.error('Failed to update credits:', creditError)
        }

        results.success++
      } catch (err) {
        console.error('Error processing payload:', err)
        results.failed++
        results.errors.push(`Exception: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    console.log(`Processed ${payloads.length} payloads: ${results.success} success, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      processed: results.success,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json(
      { error: 'Failed to process webhook', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
