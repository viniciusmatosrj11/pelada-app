import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient' // Ajuste o caminho se necessário dependendo de onde está o arquivo

export default function MinhaAssinatura() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleAbrirPortal = async () => {
    try {
      setLoading(true)

      // Pega a sessão atual do usuário logado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        alert("Você precisa estar logado para acessar o portal.")
        navigate('/Login')
        return
      }

      // URL da sua Edge Function no Supabase (substitua SEU_PROJECT_REF pela sua referência real do Supabase)
      const functionUrl = 'https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-criar-portal'

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao gerar o portal de assinatura.')
      }

      const data = await response.json()
      
      // Redireciona o usuário para o ambiente seguro do Stripe
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('URL de redirecionamento não encontrada.')
      }

    } catch (err) {
      console.error(err)
      alert(err.message || "Não foi possível abrir o gerenciador de assinatura.")
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Minha Assinatura</h2>
      <p>Gerencie seus dados de pagamento, visualize faturas ou cancele seu plano de organizador de pelada de forma segura.</p>
      
      <button 
        onClick={handleAbrirPortal}
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
        {loading ? 'Carregando Portal...' : 'Gerenciar / Cancelar Assinatura'}
      </button>
    </div>
  )
}