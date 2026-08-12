import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'

const STATUS_LABEL = {
  confirmado: { texto: 'Confirmado', cor: 'bg-grama-100 text-grama-700' },
  nao_vai: { texto: 'Não vai', cor: 'bg-barro/10 text-barro' },
  espera: { texto: 'Espera', cor: 'bg-yellow-100 text-yellow-700' },
}

export default function PeladaAdmin() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [pelada, setPelada] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrada, setNaoEncontrada] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data: peladaData } = await supabase.from('peladas').select('*').eq('slug', slug).single()

    if (!peladaData || peladaData.owner_id !== user.id) {
      setNaoEncontrada(true)
      setCarregando(false)
      return
    }
    setPelada(peladaData)

    const { data: participantesData } = await supabase
      .from('participantes')
      .select('*')
      .eq('pelada_id', peladaData.id)
      .order('created_at', { ascending: true })

    setParticipantes(participantesData ?? [])
    setCarregando(false)
  }, [slug, user])

  useEffect(() => {
    if (user) carregar()
  }, [user, carregar])

  async function alterarPagamento(participante, novoStatus) {
    await supabase.from('participantes').update({ status_pagamento: novoStatus }).eq('id', participante.id)
    setParticipantes((lista) =>
      lista.map((p) => (p.id === participante.id ? { ...p, status_pagamento: novoStatus } : p))
    )
  }

  async function removerParticipante(id) {
    if (!confirm('Remover este participante da pelada?')) return
    await supabase.from('participantes').delete().eq('id', id)
    setParticipantes((lista) => lista.filter((p) => p.id !== id))
  }

  async function promoverDaEspera(participante) {
    await supabase.from('participantes').update({ status_presenca: 'confirmado' }).eq('id', participante.id)
    setParticipantes((lista) =>
      lista.map((p) => (p.id === participante.id ? { ...p, status_presenca: 'confirmado' } : p))
    )
  }

  function copiarLink() {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-grama-600">Carregando...</div>
  }

  if (naoEncontrada) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-carvao/70 mb-4">Pelada não encontrada.</p>
          <Link to="/painel" className="btn-primario">
            Voltar ao painel
          </Link>
        </div>
      </div>
    )
  }

  const confirmados = participantes.filter((p) => p.status_presenca === 'confirmado')
  const naoVao = participantes.filter((p) => p.status_presenca === 'nao_vai')
  const espera = participantes.filter((p) => p.status_presenca === 'espera')
  const mensalistas = confirmados.filter((p) => p.tipo === 'mensalista')
  const diaristas = confirmados.filter((p) => p.tipo === 'diarista')
  const vagasDisponiveis = Math.max(pelada.limite_jogadores - confirmados.length, 0)
  const lotada = confirmados.length >= pelada.limite_jogadores

  const somaMensalistasPagos = mensalistas.filter((p) => p.status_pagamento === 'pago').length * pelada.valor_mensalista
  const somaDiaristasPagos = diaristas.filter((p) => p.status_pagamento === 'pago').length * pelada.valor_diarista

  return (
    <div className="min-h-screen bg-giz pb-16">
      <header className="bg-grama-700 text-giz px-6 pt-8 pb-6 rounded-b-3xl">
        <Link to="/painel" className="text-grama-100 text-sm font-semibold">
          ← Minhas peladas
        </Link>
        <h1 className="text-xl font-bold mt-2">⚽ {pelada.nome}</h1>
        <p className="text-grama-100 text-sm mt-1">
          {pelada.data?.split('-').reverse().join('/')} · {pelada.horario?.slice(0, 5)} · {pelada.local}
        </p>
        <button onClick={copiarLink} className="mt-3 text-sm bg-grama-600 rounded-lg px-3 py-2 font-semibold">
          {copiado ? 'Link copiado!' : `🔗 pelada.com/${slug}`}
        </button>
      </header>

      <main className="px-5 -mt-3 space-y-4">
        {/* Resumo */}
        <div className="card">
          <h2 className="font-bold text-grama-700 mb-2">Resumo</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-grama-700">{pelada.limite_jogadores}</p>
              <p className="text-xs text-carvao/60">vagas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-grama-700">{confirmados.length}</p>
              <p className="text-xs text-carvao/60">confirmados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-grama-700">{vagasDisponiveis}</p>
              <p className="text-xs text-carvao/60">disponíveis</p>
            </div>
          </div>
          {lotada && (
            <p className="text-center text-barro font-semibold text-sm mt-3">Pelada lotada 🔒</p>
          )}
        </div>

        {/* Mensalistas */}
        <div className="card">
          <h2 className="font-bold text-grama-700 mb-3">Mensalistas ({mensalistas.length})</h2>
          {mensalistas.length === 0 && <p className="text-carvao/50 text-sm">Nenhum mensalista confirmado.</p>}
          <ul className="space-y-2">
            {mensalistas.map((p) => (
              <ItemParticipante
                key={p.id}
                participante={p}
                onPagamento={alterarPagamento}
                onRemover={removerParticipante}
              />
            ))}
          </ul>
        </div>

        {/* Diaristas */}
        <div className="card">
          <h2 className="font-bold text-grama-700 mb-3">Diaristas ({diaristas.length})</h2>
          {diaristas.length === 0 && <p className="text-carvao/50 text-sm">Nenhum diarista confirmado.</p>}
          <ul className="space-y-2">
            {diaristas.map((p) => (
              <ItemParticipante
                key={p.id}
                participante={p}
                valor={pelada.valor_diarista}
                onPagamento={alterarPagamento}
                onRemover={removerParticipante}
              />
            ))}
          </ul>
        </div>

        {/* Lista de espera */}
        {espera.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-grama-700 mb-3">Lista de espera ({espera.length})</h2>
            <ul className="space-y-2">
              {espera.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b border-black/5 pb-2 last:border-0">
                  <span className="font-medium">{p.nome}</span>
                  <button onClick={() => promoverDaEspera(p)} className="text-sm font-semibold text-grama-600 underline">
                    Chamar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quem não vai */}
        {naoVao.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-grama-700 mb-3">Não vão ({naoVao.length})</h2>
            <ul className="space-y-1 text-carvao/60 text-sm">
              {naoVao.map((p) => (
                <li key={p.id}>{p.nome}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Pagamentos */}
        <div className="card">
          <h2 className="font-bold text-grama-700 mb-3">Pagamentos</h2>
          <div className="flex justify-between text-sm py-1">
            <span>Mensalistas</span>
            <span className="font-semibold">R$ {somaMensalistasPagos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span>Diaristas</span>
            <span className="font-semibold">R$ {somaDiaristasPagos.toFixed(2)}</span>
          </div>
          <div className="linha-campo my-2 rounded-full" />
          <div className="flex justify-between font-bold text-grama-700">
            <span>Total recebido</span>
            <span>R$ {(somaMensalistasPagos + somaDiaristasPagos).toFixed(2)}</span>
          </div>
        </div>
      </main>
    </div>
  )
}

function ItemParticipante({ participante, valor, onPagamento, onRemover }) {
  const pago = participante.status_pagamento === 'pago'
  return (
    <li className="flex items-center justify-between gap-2 border-b border-black/5 pb-2 last:border-0">
      <div>
        <p className="font-medium">{participante.nome}</p>
        {valor != null && <p className="text-xs text-carvao/50">R$ {Number(valor).toFixed(2)}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPagamento(participante, pago ? 'pendente' : 'pago')}
          className={`badge ${pago ? 'bg-grama-100 text-grama-700' : 'bg-yellow-100 text-yellow-700'}`}
        >
          {pago ? 'Pago' : 'Pendente'}
        </button>
        <button onClick={() => onRemover(participante.id)} className="text-carvao/30 hover:text-barro text-sm">
          remover
        </button>
      </div>
    </li>
  )
}
