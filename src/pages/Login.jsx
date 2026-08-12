import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setEnviando(false)
    if (error) {
      setErro('E-mail ou senha incorretos.')
      return
    }
    navigate('/painel')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-giz">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold text-grama-700">Pelada Fácil</h1>
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
            <label className="block text-sm font-semibold mb-1">Senha</label>
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

          <button className="btn-primario w-full" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
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
