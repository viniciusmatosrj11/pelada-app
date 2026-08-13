// supabase/functions/mp-webhook/index.ts
//
// Recebe as notificações de pagamento do Mercado Pago.
// Deploy: supabase functions deploy mp-webhook --no-verify-jwt
// (--no-verify-jwt porque quem chama essa rota é o Mercado Pago, não um usuário logado)
//
// Secrets necessários (supabase secrets set ...):
//   MP_ACCESS_TOKEN       -> access token de PRODUÇÃO da sua aplicação no Mercado Pago
//   MP_WEBHOOK_SECRET     -> "Assinatura secreta" configurada em Suas integrações > Webhooks
//   SUPABASE_URL              (já vem disponível por padrão)
//   SUPABASE_SERVICE_ROLE_KEY (já vem disponível por padrão)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const DIAS_POR_CICLO = 30

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const url = new URL(req.url)
    const bodyText = await req.text()

    let body: any = {}
    try {
      body = JSON.parse(bodyText)
    } catch {
      // a MP às vezes manda um POST de teste com corpo vazio
    }

    // ---- 1) validar a assinatura (garante que a chamada veio mesmo da Mercado Pago) ----
    const xSignature = req.headers.get('x-signature') || ''
    const xRequestId = req.headers.get('x-request-id') || ''
    const dataId = String(body?.data?.id ?? url.searchParams.get('data.id') ?? '').toLowerCase()

    const sigParts: Record<string, string> = {}
    for (const part of xSignature.split(',')) {
      const [k, v] = part.split('=')
      if (k && v) sigParts[k.trim()] = v.trim()
    }
    const ts = sigParts['ts']
    const v1 = sigParts['v1']

    if (!ts || !v1 || !dataId) {
      return new Response('Requisição sem assinatura válida', { status: 400 })
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const assinaturaEsperada = await hmacSha256Hex(MP_WEBHOOK_SECRET, manifest)

    if (!timingSafeEqual(assinaturaEsperada, v1)) {
      console.error('mp-webhook: assinatura inválida')
      return new Response('Assinatura inválida', { status: 401 })
    }

    // ---- 2) só nos interessa notificação de pagamento ----
    const topic = body?.type ?? url.searchParams.get('topic')
    if (topic !== 'payment') {
      return new Response('ok (ignorado)', { status: 200 })
    }

    // ---- 3) NUNCA confiar no status que vem no corpo do webhook: buscar o pagamento real ----
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })

    if (!mpResp.ok) {
      console.error('mp-webhook: falha ao consultar pagamento', await mpResp.text())
      // 502 faz a MP tentar reenviar mais tarde
      return new Response('Erro ao consultar pagamento', { status: 502 })
    }

    const payment = await mpResp.json()

    if (payment.status !== 'approved') {
      // pendente, rejeitado, estornado etc. — não faz nada por enquanto
      return new Response('ok (não aprovado)', { status: 200 })
    }

    // ---- 4) idempotência: registra o payment.id antes de aplicar qualquer efeito ----
    const email = String(payment.external_reference || payment.payer?.email || '')
      .toLowerCase()
      .trim()

    if (!email) {
      console.error('mp-webhook: pagamento aprovado sem e-mail identificável', payment.id)
      return new Response('ok (sem e-mail)', { status: 200 })
    }

    const { error: dedupeError } = await supabaseAdmin
      .from('mp_pagamentos_processados')
      .insert({ payment_id: String(payment.id), comprador_email: email })

    if (dedupeError) {
      if (dedupeError.code === '23505') {
        // já processamos esse payment_id antes (retry da MP) — responde ok sem repetir a renovação
        return new Response('ok (duplicado)', { status: 200 })
      }
      console.error('mp-webhook: erro ao registrar idempotência', dedupeError)
      return new Response('Erro interno', { status: 500 })
    }

    // ---- 5) renova a licença via função SQL atômica ----
    const { error: rpcError } = await supabaseAdmin.rpc('renovar_licenca', {
      p_email: email,
      p_dias: DIAS_POR_CICLO,
      p_payment_id: String(payment.id),
    })

    if (rpcError) {
      console.error('mp-webhook: erro ao renovar licença', rpcError)
      return new Response('Erro ao renovar licença', { status: 500 })
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('mp-webhook: erro inesperado', err)
    return new Response('Erro interno', { status: 500 })
  }
})
