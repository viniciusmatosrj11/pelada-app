// supabase/functions/criar-preferencia/index.ts
//
// Chamada pelo front-end (usuário logado) para gerar o link de pagamento.
// Deploy: supabase functions deploy criar-preferencia
// (SEM --no-verify-jwt: aqui a gente QUER exigir o usuário autenticado)
//
// Secrets necessários:
//   MP_ACCESS_TOKEN -> mesmo access token de produção usado no webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Ajuste para a URL pública do seu app
const URL_SUCESSO = 'https://seu-dominio.com/painel?pagamento=sucesso'
const URL_FALHA = 'https://seu-dominio.com/painel?pagamento=falha'
const URL_PENDENTE = 'https://seu-dominio.com/painel?pagamento=pendente'
const VALOR_ASSINATURA = 29.9 // ajuste para o preço da sua assinatura mensal

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
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
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // O external_reference é o que o webhook vai usar pra identificar o comprador —
    // por isso ele vem do usuário autenticado no back-end, nunca do corpo da requisição.
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
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await mpResp.json()

    return new Response(
      JSON.stringify({ init_point: data.init_point, preference_id: data.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('criar-preferencia: erro inesperado', err)
    return new Response(JSON.stringify({ erro: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
