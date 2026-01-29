import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { deprovisionServer } from '@/lib/provisioning/server'

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
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    console.error('Webhook Error: Missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${message}`)
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.type}:`, error)
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const userId = session.metadata?.userId
  const botName = session.metadata?.botName
  const subscriptionId = session.subscription as string

  if (!userId || !botName) {
    console.error('Webhook Error: Missing userId or botName in session metadata')
    return
  }

  if (!subscriptionId) {
    console.error('Webhook Error: Missing subscription ID in checkout session')
    return
  }

  const { data: existingBot } = await supabase
    .from('bots')
    .select('id')
    .eq('user_id', userId)
    .eq('name', botName)
    .single()

  if (existingBot) {
    console.log(`Bot "${botName}" already exists for user ${userId}, skipping creation`)
    return
  }

  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId)
  const subscriptionItem = subscriptionResponse.items.data[0]
  const currentPeriodEnd = subscriptionItem?.current_period_end ?? Math.floor(Date.now() / 1000)

  const { data: newBot, error: botError } = await supabase
    .from('bots')
    .insert({
      user_id: userId,
      name: botName,
      status: 'starting' as const,
      hetzner_server_id: null,
      encrypted_api_key: '',
      telegram_bot_token_encrypted: '',
    })
    .select('id')
    .single()

  if (botError || !newBot) {
    console.error('Failed to create bot:', botError)
    return
  }

  console.log(`Created bot "${botName}" with id ${newBot.id} for user ${userId}`)

  const { error: subError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      bot_id: newBot.id,
      stripe_subscription_id: subscriptionId,
      status: 'active' as const,
      current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
    })

  if (subError) {
    console.error('Failed to create subscription:', subError)
    return
  }

  console.log(`Created subscription for bot ${newBot.id} with Stripe subscription ${subscriptionId}`)

  triggerProvisioning(newBot.id)
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: any
) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription
  const subscriptionIdStr = typeof subscriptionId === 'string' 
    ? subscriptionId 
    : subscriptionId?.id

  if (!subscriptionIdStr) {
    console.log('Invoice is not subscription-related, skipping')
    return
  }

  const lineItem = invoice.lines.data[0]
  if (!lineItem) {
    console.error('No line items in invoice')
    return
  }

  const periodEnd = lineItem.period?.end
    ? new Date(lineItem.period.end * 1000).toISOString()
    : new Date().toISOString()

  const { data: subscription, error: findError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscriptionIdStr)
    .single()

  if (findError || !subscription) {
    console.warn(`Subscription not found for Stripe subscription ${subscriptionIdStr}`)
    return
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active' as const,
      current_period_end: periodEnd,
    })
    .eq('id', subscription.id)

  if (updateError) {
    console.error('Failed to update subscription:', updateError)
    return
  }

  console.log(`Updated subscription ${subscription.id} to active with period end ${periodEnd}`)
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription
  const subscriptionIdStr = typeof subscriptionId === 'string' 
    ? subscriptionId 
    : subscriptionId?.id

  if (!subscriptionIdStr) {
    console.log('Invoice is not subscription-related, skipping')
    return
  }

  const { data: subscription, error: findError } = await supabase
    .from('subscriptions')
    .select('id, bot_id')
    .eq('stripe_subscription_id', subscriptionIdStr)
    .single()

  if (findError || !subscription) {
    console.warn(`Subscription not found for Stripe subscription ${subscriptionIdStr}`)
    return
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due' as const,
    })
    .eq('id', subscription.id)

  if (updateError) {
    console.error('Failed to update subscription to past_due:', updateError)
    return
  }

  console.log(`Updated subscription ${subscription.id} to past_due due to payment failure`)
}

async function handleSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription,
  supabase: any
) {
  const subscriptionId = stripeSubscription.id

  const { data: subscription, error: findError } = await supabase
    .from('subscriptions')
    .select('id, bot_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (findError || !subscription) {
    console.warn(`Subscription not found for Stripe subscription ${subscriptionId}`)
    return
  }

  const { error: subUpdateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled' as const,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)

  if (subUpdateError) {
    console.error('Failed to update subscription to canceled:', subUpdateError)
    return
  }

  console.log(`Updated subscription ${subscription.id} to canceled`)

  const { error: botUpdateError } = await supabase
    .from('bots')
    .update({
      status: 'stopped' as const,
    })
    .eq('id', subscription.bot_id)

  if (botUpdateError) {
    console.error('Failed to update bot to stopped:', botUpdateError)
    return
  }

  console.log(`Updated bot ${subscription.bot_id} to stopped`)

  await deprovisionServer(subscription.bot_id)
}
