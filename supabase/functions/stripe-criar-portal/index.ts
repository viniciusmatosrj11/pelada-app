import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@17?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  // 1. Verificar se é POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // 2. Criar cliente Supabase com os dados do usuário autenticado (JWT)
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  // 3. Obter o usuário logado
  const { data: { user }, error } = await supabaseClient.auth.getUser()
  if (error || !user) {
    return new Response('Não autorizado', { status: 401 })
  }

  // 4. Buscar o stripe_customer_id do usuário no seu banco
  const { data: profile } = await supabaseClient
    .from('profiles') // ajuste aqui o nome da sua tabela de usuários
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return new Response(JSON.stringify({ error: 'Assinatura não encontrada' }), { status: 404 })
  }

  // 5. Criar a sessão do portal do Stripe
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${req.headers.get('origin')}/dashboard`, // URL para onde ele volta após cancelar/gerenciar
  })

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  })
})