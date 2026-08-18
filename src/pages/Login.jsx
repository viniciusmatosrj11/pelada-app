import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setMensagem('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setEnviando(false)
    if (error) {
      setErro('E-mail ou senha incorretos.')
      return
    }
    navigate('/painel')
  }

  async function esqueciSenha() {
    if (!email) {
      setErro('Por favor, digite seu e-mail acima para recuperar a senha.')
      return
    }
    setErro('')
    setMensagem('')
    setEnviando(true)

    // Envia o link de recuperação usando a URL atual do site na Vercel
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    })

    setEnviando(false)
    if (error) {
      setErro('Erro ao enviar e-mail de recuperação: ' + error.message)
    } else {
      setMensagem('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-giz">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold text-grama-700">FutManager</h1>
          <p className="text-carvao/60 mt-1">Organize sua pelada em minutos</p>
        </div>

        <form onSubmit={entrar} className="card space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">E-mail</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold">Senha</label>
              <button
                type="button"
                onClick={esqueciSenha}
                className="text-xs text-grama-600 font-semibold hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
            <input
              className="input"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erro && <p className="text-barro text-sm font-medium">{erro}</p>}
          {mensagem && <p className="text-grama-600 text-sm font-medium">{mensagem}</p>}

          <button className="btn-primario w-full" disabled={enviando}>
            {enviando ? 'Carregando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-carvao/60 mt-6">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="text-grama-600 font-semibold">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}