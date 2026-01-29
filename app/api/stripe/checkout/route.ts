import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { encrypt } from '@/lib/crypto/encryption'

interface CheckoutRequestBody {
  botName: string
}

function getDefaultApiKeyEncrypted(): string {
  const defaultKey = process.env.DEFAULT_ANTHROPIC_API_KEY
  if (!defaultKey) {
    return ''
  }
  const apiKeys = {
    anthropic: defaultKey,
    openai: null,
  }
  return encrypt(JSON.stringify(apiKeys))
}

function triggerProvisioning(botId: string): void {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const provisionSecret = process.env.PROVISION_API_SECRET

  if (!appUrl || !provisionSecret) {
    console.error('Missing NEXT_PUBLIC_APP_URL or PROVISION_API_SECRET for provisioning')
    return
  }

  fetch(`${appUrl}/api/provision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-provision-secret': provisionSecret,
    },
    body: JSON.stringify({ botId }),
  }).catch((err) => {
    console.error('Failed to trigger provisioning:', err)
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json() as CheckoutRequestBody
    const { botName } = body

    if (!botName || typeof botName !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid botName' },
        { status: 400 }
      )
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (process.env.SKIP_STRIPE === 'true') {
      console.log('[SKIP_STRIPE] Bypassing Stripe checkout, creating bot directly')

      const adminClient = createAdminClient()

      const { data: existingBot } = await adminClient
        .from('bots')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', botName)
        .single()

      if (existingBot) {
        return NextResponse.json(
          { error: 'A bot with this name already exists' },
          { status: 400 }
        )
      }

      const { data: newBot, error: botError } = await adminClient
        .from('bots')
        .insert({
          user_id: user.id,
          name: botName,
          status: 'starting' as const,
          hetzner_server_id: null,
          encrypted_api_key: getDefaultApiKeyEncrypted(),
          telegram_bot_token_encrypted: '',
        })
        .select('id')
        .single()

      if (botError || !newBot) {
        console.error('[SKIP_STRIPE] Failed to create bot:', botError)
        return NextResponse.json(
          { error: 'Failed to create bot' },
          { status: 500 }
        )
      }

      console.log(`[SKIP_STRIPE] Created bot "${botName}" with id ${newBot.id}`)

      const mockSubscriptionId = `skip_stripe_${Date.now()}_${Math.random().toString(36).substring(7)}`
      const currentPeriodEnd = new Date()
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)

      const { error: subError } = await adminClient
        .from('subscriptions')
        .insert({
          user_id: user.id,
          bot_id: newBot.id,
          stripe_subscription_id: mockSubscriptionId,
          status: 'active' as const,
          current_period_end: currentPeriodEnd.toISOString(),
        })

      if (subError) {
        console.error('[SKIP_STRIPE] Failed to create subscription:', subError)
        await adminClient.from('bots').delete().eq('id', newBot.id)
        return NextResponse.json(
          { error: 'Failed to create subscription' },
          { status: 500 }
        )
      }

      console.log(`[SKIP_STRIPE] Created mock subscription for bot ${newBot.id}`)

      triggerProvisioning(newBot.id)

      return NextResponse.json({ url: `${origin}/dashboard?success=true` })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile with stripe_customer_id:', updateError)
        return NextResponse.json(
          { error: 'Failed to save customer information' },
          { status: 500 }
        )
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        botName: botName,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          botName: botName,
        },
      },
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/dashboard?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
