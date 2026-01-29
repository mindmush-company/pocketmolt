import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return stripeClient
}

export const stripe = {
  get customers() {
    return getStripe().customers
  },
  get checkout() {
    return getStripe().checkout
  },
  get billingPortal() {
    return getStripe().billingPortal
  },
  get subscriptions() {
    return getStripe().subscriptions
  },
  get webhooks() {
    return getStripe().webhooks
  }
}

export default getStripe
