// supabase/functions/criar-preferencia/index.ts
//
// Chamada pelo front-end (usuário logado) para gerar o link de pagamento.
// Deploy: supabase functions deploy criar-preferencia

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// URLs ajustadas para o seu domínio na Vercel
const URL_SUCESSO = 'https://pelada-app-alpha.vercel.app/painel?pagamento=sucesso'
const URL_FALHA = 'https://pelada-app-alpha.vercel.app/painel?pagamento=falha'
const URL_PENDENTE = 'https://pelada-app-alpha.vercel.app/painel?pagamento=pendente'
const VALOR_ASSINATURA = 29.9 // preço da assinatura mensal

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Trata o preflight request do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Identifica o usuário a partir do JWT enviado no Authorization header
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user?.email) {
      return new Response(JSON.stringify({ erro: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const preferencia = {
      items: [
        {
          title: 'FutManager — Assinatura mensal',
          quantity: 1,
          unit_price: VALOR_ASSINATURA,
          currency_id: 'BRL',
        },
      ],
      payer: { email: user.email },
      external_reference: user.email.toLowerCase(),
      back_urls: {
        success: URL_SUCESSO,
        failure: URL_FALHA,
        pending: URL_PENDENTE,
      },
      auto_return: 'approved',
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
    }

    const mpResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencia),
    })

    if (!mpResp.ok) {
      const detalhe = await mpResp.text()
      console.error('criar-preferencia: erro na API da MP', detalhe)
      return new Response(JSON.stringify({ erro: 'Falha ao criar preferência' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await mpResp.json()

    return new Response(
      JSON.stringify({ init_point: data.init_point, preference_id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('criar-preferencia: erro inesperado', err)
    return new Response(JSON.stringify({ erro: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})