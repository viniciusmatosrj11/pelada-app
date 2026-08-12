import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Cadastro() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const navigate = useNavigate()

  async function cadastrar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    })

    if (error) {
      setErro('Não foi possível criar sua conta. ' + error.message)
      setEnviando(false)
      return
    }

    // Cria o perfil do dono na tabela "profiles"
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, nome, email })
    }

    setEnviando(false)

    // Se a confirmação por e-mail estiver habilitada no Supabase, ainda não há sessão.
    if (data.session) {
      navigate('/painel')
    } else {
      setSucesso(true)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-4xl mb-3">📩</div>
          <h1 className="text-xl font-bold text-grama-700 mb-2">Confira seu e-mail</h1>
          <p className="text-carvao/70">
            Enviamos um link de confirmação para {email}. Depois de confirmar, é só entrar normalmente.
          </p>
          <Link to="/entrar" className="btn-primario inline-flex mt-6">
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-giz">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold text-grama-700">Criar conta</h1>
          <p className="text-carvao/60 mt-1">Para organizar suas peladas</p>
        </div>

        <form onSubmit={cadastrar} className="card space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Seu nome</label>
            <input className="input" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">E-mail</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Senha</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {erro && <p className="text-barro text-sm font-medium">{erro}</p>}

          <button className="btn-primario w-full" disabled={enviando}>
            {enviando ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-carvao/60 mt-6">
          Já tem conta?{' '}
          <Link to="/entrar" className="text-grama-600 font-semibold">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
