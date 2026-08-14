import Stripe from 'https://esm.sh/stripe@17?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const DIAS_POR_CICLO = 30

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  const bodyText = await req.text()

  if (!signature) {
    return new Response('Assinatura ausente', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(bodyText, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('stripe-webhook: assinatura inválida', err)
    return new Response('Assinatura inválida', { status: 400 })
  }

  try {
    if (event.type !== 'invoice.paid') {
      return new Response('ok (ignorado)', { status: 200 })
    }

    const invoice = event.data.object as Stripe.Invoice
    const email = (invoice.customer_email || '').toLowerCase().trim()
    const stripeCustomerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null

    if (!email) {
      console.error('stripe-webhook: invoice paga sem e-mail identificável', event.id)
      return new Response('ok (sem e-mail)', { status: 200 })
    }

    const { error: dedupeError } = await supabaseAdmin
      .from('stripe_eventos_processados')
      .insert({ event_id: event.id, comprador_email: email })

    if (dedupeError) {
      if (dedupeError.code === '23505') {
        return new Response('ok (duplicado)', { status: 200 })
      }
      console.error('stripe-webhook: erro ao registrar idempotência', dedupeError)
      return new Response('Erro interno', { status: 500 })
    }

    const { error: rpcError } = await supabaseAdmin.rpc('renovar_licenca', {
      p_email: email,
      p_dias: DIAS_POR_CICLO,
      p_payment_id: event.id,
      p_stripe_customer_id: stripeCustomerId,
    })

    if (rpcError) {
      console.error('stripe-webhook: erro ao renovar licença', rpcError)
      return new Response('Erro ao renovar licença', { status: 500 })
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('stripe-webhook: erro inesperado', err)
    return new Response('Erro interno', { status: 500 })
  }
})