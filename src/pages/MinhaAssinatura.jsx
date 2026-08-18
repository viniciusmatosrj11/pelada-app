import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function MinhaAssinatura() {
  const [loading, setLoading] = useState(false)
  const [diasRestantes, setDiasRestantes] = useState(null)
  const [emTrial, setEmTrial] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    verificarStatusTrial()
  }, [])

  async function verificarStatusTrial() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.created_at) {
        const dataCadastro = new Date(user.created_at)
        const dataAtual = new Date()
        const diferencaDias = (dataAtual - dataCadastro) / (1000 * 60 * 60 * 24)
        
        if (diferencaDias <= 7) {
          setEmTrial(true)
          setDiasRestantes(Math.max(0, Math.ceil(7 - diferencaDias)))
        }
      }
    } catch (err) {
      console.error("Erro ao calcular trial", err)
    }
  }

  const handleAssinarOuGerenciar = async () => {
    try {
      setLoading(true)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        alert("Você precisa estar logado para continuar.")
        navigate('/entrar')
        return
      }

      const user = session.user

      // 1. Verifica no banco se o usuário já possui um customer_id do Stripe
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()

      const supabaseUrl = supabase.supabaseUrl

      // 2. Direciona para o portal se já tem ID, ou para o checkout correto se não tem
      const functionName = profile?.stripe_customer_id ? 'stripe-criar-portal' : 'criar-checkout-stripe'
      const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: user.email })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar a solicitação com o Stripe.')
      }

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('URL de redirecionamento não encontrada.')
      }

    }cta catch (err) {
      console.error(err)
      alert(err.message || "Não foi possível abrir o painel de pagamento.")
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Minha Assinatura</h2>

      {emTrial && (
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
          <p style={{ fontWeight: 'bold', color: '#92400E', margin: '0 0 5px 0' }}>Período de Teste Gratuito Ativo</p>
          <p style={{ color: '#B45309', margin: 0 }}>Você tem <strong>{diasRestantes} dia(s) restante(s)</strong> de acesso livre para testar todas as funcionalidades do sistema.</p>
        </div>
      )}

      <p>Gerencie seus dados de pagamento, visualize faturas ou assine o plano de organizador de pelada para garantir acesso contínuo.</p>
      
      <button 
        onClick={handleAssinarOuGerenciar}
        disabled={loading}
        style={{
          backgroundColor: '#FFD400',
          color: '#0E1F17',
          border: '3px solid #0E1F17',
          padding: '12px 24px',
          fontWeight: 'bold',
          borderRadius: '6px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        {loading ? 'Processando...' : 'Assinar / Gerenciar Plano'}
      </button>
    </div>
  )
}