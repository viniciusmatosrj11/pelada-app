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
  const [copiadoZap, setCopiadoZap] = useState(false)

  // Estados para controlar a edição (incluindo Pix)
  const [editando, setEditando] = useState(false)
  const [formEdicao, setFormEdicao] = useState({
    nome: '',
    local: '',
    horario: '',
    limite_jogadores: '',
    chave_pix: '',
  })

  // Estado para adicionar participante manualmente
  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState('diarista')
  const [adicionando, setAdicionando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data: peladaData } = await supabase.from('peladas').select('*').eq('slug', slug).single()

    if (!peladaData || peladaData.owner_id !== user.id) {
      setNaoEncontrada(true)
      setCarregando(false)
      return
    }
    setPelada(peladaData)
    setFormEdicao({
      nome: peladaData.nome || '',
      local: peladaData.local || '',
      horario: peladaData.horario || '',
      limite_jogadores: peladaData.limite_jogadores || '',
      chave_pix: peladaData.chave_pix || '',
    })

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

  async function salvarEdicao(e) {
    e.preventDefault()
    const { error } = await supabase
      .from('peladas')
      .update({
        nome: formEdicao.nome,
        local: formEdicao.local,
        horario: formEdicao.horario,
        limite_jogadores: Number(formEdicao.limite_jogadores),
        chave_pix: formEdicao.chave_pix,
      })
      .eq('id', pelada.id)

    if (!error) {
      setPelada({ 
        ...pelada, 
        ...formEdicao, 
        limite_jogadores: Number(formEdicao.limite_jogadores) 
      })
      setEditando(false)
    } else {
      alert('Erro ao salvar alterações.')
    }
  }

  async function adicionarParticipanteManual(e) {
    e.preventDefault()
    if (!novoNome.trim()) return

    setAdicionando(true)

    // Verifica se a pelada está lotada para decidir se entra como confirmado ou espera
    const confirmadosCount = participantes.filter((p) => p.status_presenca === 'confirmado').length
    const statusPresenca = confirmadosCount >= pelada.limite_jogadores ? 'espera' : 'confirmado'

    const { data, error } = await supabase
      .from('participantes')
      .insert([
        {
          pelada_id: pelada.id,
          nome: novoNome.trim(),
          tipo: novoTipo,
          status_presenca: statusPresenca,
          status_pagamento: 'pendente'
        }
      ])
      .select()

    if (error) {
      alert('Erro ao adicionar participante.')
    } else if (data) {
      setParticipantes([...participantes, data[0]])
      setNovoNome('')
    }
    setAdicionando(false)
  }

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

  async function resetarDiaristas() {
    const totalDiaristas = participantes.filter((p) => p.tipo === 'diarista').length

    if (totalDiaristas === 0) {
      alert('Já não há diaristas na lista.')
      return
    }

    const confirmar = confirm(
      `Isso vai apagar os ${totalDiaristas} diarista(s) da lista atual (confirmados, na espera e os que não vão) ` +
        `para começar a semana com a lista de diaristas vazia. Os mensalistas não são afetados. Quer continuar?`
    )
    if (!confirmar) return

    const { error } = await supabase
      .from('participantes')
      .delete()
      .eq('pelada_id', pelada.id)
      .eq('tipo', 'diarista')

    if (error) {
      alert('Erro ao resetar a lista de diaristas. Tente novamente.')
      return
    }

    setParticipantes((lista) => lista.filter((p) => p.tipo !== 'diarista'))
  }

  function copiarLink() {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function compartilharWhatsApp() {
    const confirmadosLista = participantes.filter((p) => p.status_presenca === 'confirmado')
    const vagasRestantes = Math.max(pelada.limite_jogadores - confirmadosLista.length, 0)
    const linkPelada = `${window.location.origin}/${slug}`

    let texto = `⚽ *LISTA DA PELADA: ${pelada.nome.toUpperCase()}* ⚽\n`
    texto += `📅 Data: ${pelada.data?.split('-').reverse().join('/')} às ${pelada.horario?.slice(0, 5)}\n`
    texto += `📍 Local: ${pelada.local}\n\n`
    texto += `✅ *Confirmados (${confirmadosLista.length}/${pelada.limite_jogadores}):*\n`

    if (confirmadosLista.length === 0) {
      texto += `_Nenhum confirmado ainda. Seja o primeiro!_\n`
    } else {
      confirmadosLista.forEach((p, index) => {
        const tipoIcon = p.tipo === 'mensalista' ? '⭐' : '⚽'
        texto += `${index + 1}. ${p.nome} ${tipoIcon}\n`
      })
    }

    if (vagasRestantes > 0) {
      texto += `\n🔥 *Faltam apenas ${vagasRestantes} vaga(s)!*\n`
    } else {
      texto += `\n🔒 *Pelada Lotada!*\n`
    }

    texto += `\n👉 Garanta sua vaga ou entre na lista pelo link:\n${linkPelada}`

    navigator.clipboard.writeText(texto)
    setCopiadoZap(true)
    setTimeout(() => setCopiadoZap(false), 2500)
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

        {editando ? (
          <form onSubmit={salvarEdicao} className="mt-3 space-y-3 bg-grama-600/40 p-4 rounded-xl">
            <h2 className="text-sm font-bold text-grama-100">Editando informações</h2>
            <div>
              <label className="text-xs text-grama-100">Nome</label>
              <input
                className="w-full p-2 text-carvao rounded bg-white"
                value={formEdicao.nome}
                onChange={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-grama-100">Local</label>
              <input
                className="w-full p-2 text-carvao rounded bg-white"
                value={formEdicao.local}
                onChange={(e) => setFormEdicao({ ...formEdicao, local: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-grama-100">Chave Pix (CPF, CNPJ, E-mail, Telefone ou Aleatória)</label>
              <input
                className="w-full p-2 text-carvao rounded bg-white"
                value={formEdicao.chave_pix}
                onChange={(e) => setFormEdicao({ ...formEdicao, chave_pix: e.target.value })}
                placeholder="Ex: seu-email@provedor.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-grama-100">Horário</label>
                <input
                  type="time"
                  className="w-full p-2 text-carvao rounded bg-white"
                  value={formEdicao.horario}
                  onChange={(e) => setFormEdicao({ ...formEdicao, horario: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-grama-100">Limite Jogadores</label>
                <input
                  type="number"
                  className="w-full p-2 text-carvao rounded bg-white"
                  value={formEdicao.limite_jogadores}
                  onChange={(e) => setFormEdicao({ ...formEdicao, limite_jogadores: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primario flex-1 text-sm py-2">Salvar</button>
              <button type="button" onClick={() => setEditando(false)} className="bg-white/20 text-white rounded px-3 py-2 text-sm flex-1">Cancelar</button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex justify-between items-start mt-2">
              <h1 className="text-xl font-bold">⚽ {pelada.nome}</h1>
              <button onClick={() => setEditando(true)} className="text-xs bg-grama-600 hover:bg-grama-500 text-white px-2.5 py-1 rounded-md font-semibold">
                ✏️ Editar
              </button>
            </div>
            <p className="text-grama-100 text-sm mt-1">
              {pelada.data?.split('-').reverse().join('/')} · {pelada.horario?.slice(0, 5)} · {pelada.local}
            </p>
            {pelada.chave_pix && (
              <p className="text-xs text-grama-100 mt-1">
                💳 Pix Cadastrado: <span className="font-semibold">{pelada.chave_pix}</span>
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={copiarLink} className="text-xs bg-grama-600 hover:bg-grama-500 rounded-lg p-2.5 font-semibold text-center text-white">
            {copiado ? '✓ Link copiado!' : '🔗 Copiar Link'}
          </button>
          <button onClick={compartilharWhatsApp} className="text-xs bg-green-600 hover:bg-green-500 rounded-lg p-2.5 font-semibold text-center text-white">
            {copiadoZap ? '✓ Lista copiada!' : '🟢 Copiar p/ WhatsApp'}
          </button>
        </div>
      </header>

      {/* Restante da página (Resumo, Adicionar Manual, Participantes, etc) */}
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

        {/* Adicionar Participante Manualmente */}
        <div className="card bg-grama-100/50 border border-grama-200">
          <h2 className="font-bold text-grama-700 mb-2 text-sm">➕ Adicionar participante manualmente</h2>
          <form onSubmit={adicionarParticipanteManual} className="space-y-2">
            <input
              type="text"
              placeholder="Nome do jogador..."
              className="w-full p-2 text-sm text-carvao rounded border border-black/10 bg-white"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <select
                className="p-2 text-sm text-carvao rounded border border-black/10 bg-white flex-1"
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value)}
              >
                <option value="diarista">Diarista</option>
                <option value="mensalista">Mensalista</option>
              </select>
              <button
                type="submit"
                disabled={adicionando}
                className="btn-primario text-sm py-2 px-4"
              >
                {adicionando ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </form>
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
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-grama-700">Diaristas ({diaristas.length})</h2>
            <button
              onClick={resetarDiaristas}
              className="text-xs bg-barro/10 hover:bg-barro/20 text-barro px-2.5 py-1 rounded-md font-semibold"
            >
              🔄 Resetar lista
            </button>
          </div>
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