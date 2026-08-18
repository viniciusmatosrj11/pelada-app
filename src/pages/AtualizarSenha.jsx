import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AtualizarSenha() {
  const [novaSenha, setNovaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [carregandoToken, setCarregandoToken] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // O Supabase joga os tokens de recuperação após o '#' na URL.
    // Precisamos processar isso para autenticar temporariamente o usuário para a troca de senha.
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCarregandoToken(false)
      }
    })

    // Fallback caso o evento demore ou já tenha capturado
    const timer = setTimeout(() => {
      setCarregandoToken(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  async function atualizar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    setEnviando(false)

    if (error) {
      setErro('Erro ao atualizar a senha: ' + error.message)
      return
    }

    setSucesso(true)
    setTimeout(() => {
      navigate('/entrar')
    }, 3000)
  }

  if (carregandoToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-giz">
        <p className="text-carvao/70 font-medium">Validando link de recuperação...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-giz">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-2xl font-bold text-grama-700">Nova Senha</h1>
          <p className="text-carvao/60 mt-1">Digite sua nova senha abaixo</p>
        </div>

        {sucesso ? (
          <div className="card text-center space-y-4">
            <p className="text-grama-600 font-semibold">Senha atualizada com sucesso!</p>
            <p className="text-sm text-carvao/60">Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={atualizar} className="card space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nova senha</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
              />
            </div>

            {erro && <p className="text-barro text-sm font-medium">{erro}</p>}

            <button className="btn-primario w-full" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}