import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Hook simples: expõe o usuário logado (ou null) e se ainda está carregando.
// Fica escutando mudanças de sessão (login, logout, etc.)
export function useAuth() {
  const [user, setUser] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, carregando }
}
