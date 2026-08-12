import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'

// Gera um slug simples e legível a partir do nome da pelada,
// adicionando um sufixo curto para evitar links repetidos.
function gerarSlug(nome) {
  const base = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const sufixo = Math.random().toString(36).slice(2, 6)
  return `${base}-${sufixo}`
}

export default function CriarPelada() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nome: '',
    local: '',
    data: '',
    horario: '',
    limite_jogadores: 20,
    valor_mensalista: '',
    valor_diarista: '',
  })
  const [linkCriado, setLinkCriado] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function criar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const slug = gerarSlug(form.nome)

    const { data, error } = await supabase
      .from('peladas')
      .insert({
        owner_id: user.id,
        nome: form.nome,
        local: form.local,
        data: form.data,
        horario: form.horario,
        limite_jogadores: Number(form.limite_jogadores),
        valor_mensalista: form.valor_mensalista ? Number(form.valor_mensalista) : 0,
        valor_diarista: form.valor_diarista ? Number(form.valor_diarista) : 0,
        slug,
      })
      .select()
      .single()

    setEnviando(false)

    if (error) {
      setErro('Não foi possível criar a pelada. Tente novamente.')
      return
    }

    setLinkCriado(data.slug)
  }

  function copiarLink() {
    const url = `${window.location.origin}/${linkCriado}`
    navigator.clipboard.writeText(url)
  }

  if (linkCriado) {
    const url = `${window.location.origin}/${linkCriado}`
    const textoWhatsapp = encodeURIComponent(`⚽ Confirme presença na pelada: ${url}`)
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-giz text-center">
        <div className="w-full max-w-sm">
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-xl font-bold text-grama-700 mb-1">Pelada criada com sucesso!</h1>
          <p className="text-carvao/70 mb-5">Envie este link para o grupo confirmar presença.</p>

          <div className="card">
            <p className="text-sm text-carvao/60 mb-1">Link da pelada</p>
            <p className="font-semibold break-all text-grama-700">{url}</p>
          </div>

          <div className="space-y-3 mt-5">
            <button onClick={copiarLink} className="btn-secundario w-full">
              Copiar link
            </button>
            <a
              href={`https://wa.me/?text=${textoWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primario w-full"
            >
              Compartilhar no WhatsApp
            </a>
            <button onClick={() => navigate(`/painel/${linkCriado}`)} className="btn-secundario w-full">
              Ver painel da pelada
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-giz px-6 py-8">
      <Link to="/painel" className="text-grama-600 text-sm font-semibold">
        ← Voltar
      </Link>

      <h1 className="text-2xl font-bold text-grama-700 mt-4 mb-6">Criar pelada</h1>

      <form onSubmit={criar} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Nome da pelada</label>
          <input
            className="input"
            required
            placeholder="Pelada do Sábado"
            value={form.nome}
            onChange={(e) => atualizar('nome', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Local</label>
          <input
            className="input"
            required
            placeholder="Arena X"
            value={form.local}
            onChange={(e) => atualizar('local', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Data</label>
            <input
              className="input"
              type="date"
              required
              value={form.data}
              onChange={(e) => atualizar('data', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Horário</label>
            <input
              className="input"
              type="time"
              required
              value={form.horario}
              onChange={(e) => atualizar('horario', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Limite de jogadores</label>
          <input
            className="input"
            type="number"
            min={1}
            required
            value={form.limite_jogadores}
            onChange={(e) => atualizar('limite_jogadores', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Valor mensalista (R$)</label>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              placeholder="100"
              value={form.valor_mensalista}
              onChange={(e) => atualizar('valor_mensalista', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Valor diarista (R$)</label>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              placeholder="20"
              value={form.valor_diarista}
              onChange={(e) => atualizar('valor_diarista', e.target.value)}
            />
          </div>
        </div>

        {erro && <p className="text-barro text-sm font-medium">{erro}</p>}

        <button className="btn-primario w-full" disabled={enviando}>
          {enviando ? 'Criando...' : 'Criar pelada'}
        </button>
      </form>
    </div>
  )
}