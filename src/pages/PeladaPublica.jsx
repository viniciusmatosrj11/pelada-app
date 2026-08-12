import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Etapas da tela pública: pergunta -> formulário -> confirmado
export default function PeladaPublica() {
  const { slug } = useParams()

  const [pelada, setPelada] = useState(null)
  const [confirmadosCount, setConfirmadosCount] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrada, setNaoEncontrada] = useState(false)

  const [etapa, setEtapa] = useState('pergunta') // pergunta | formulario | pronto
  const [vaiJogar, setVaiJogar] = useState(true)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('mensalista')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [entrouNaEspera, setEntrouNaEspera] = useState(false)

  useEffect(() => {
    carregar()
  }, [slug])

  async function carregar() {
    setCarregando(true)
    const { data: peladaData } = await supabase.from('peladas').select('*').eq('slug', slug).single()

    if (!peladaData) {
      setNaoEncontrada(true)
      setCarregando(false)
      return
    }
    setPelada(peladaData)

    const { count } = await supabase
      .from('participantes')
      .select('*', { count: 'exact', head: true })
      .eq('pelada_id', peladaData.id)
      .eq('status_presenca', 'confirmado')

    setConfirmadosCount(count ?? 0)
    setCarregando(false)
  }

  function escolher(vai) {
    setVaiJogar(vai)
    setEtapa('formulario')
  }

  async function confirmar(e) {
    e.preventDefault()
    setErro('')

    if (!nome.trim()) {
      setErro('Digite seu nome.')
      return
    }

    setEnviando(true)

    const lotada = confirmadosCount >= pelada.limite_jogadores
    let statusPresenca = 'nao_vai'
    if (vaiJogar) {
      statusPresenca = lotada ? 'espera' : 'confirmado'
    }

    const { error } = await supabase.from('participantes').insert({
      pelada_id: pelada.id,
      nome: nome.trim(),
      tipo: vaiJogar ? tipo : null,
      status_presenca: statusPresenca,
      status_pagamento: 'pendente',
    })

    setEnviando(false)

    if (error) {
      setErro('Não foi possível confirmar. Tente novamente.')
      return
    }

    setEntrouNaEspera(statusPresenca === 'espera')
    setEtapa('pronto')
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-grama-600">Carregando...</div>
  }

  if (naoEncontrada) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-carvao/70">Essa pelada não existe ou o link está incorreto.</p>
      </div>
    )
  }

  const lotada = confirmadosCount >= pelada.limite_jogadores
  const vagasDisponiveis = Math.max(pelada.limite_jogadores - confirmadosCount, 0)

  return (
    <div className="min-h-screen bg-giz flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-xl font-bold text-grama-700 uppercase">{pelada.nome}</h1>
        </div>

        <div className="card mb-5">
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-semibold">Data:</span> {pelada.data?.split('-').reverse().join('/')}
            </p>
            <p>
              <span className="font-semibold">Horário:</span> {pelada.horario?.slice(0, 5)}
            </p>
            <p>
              <span className="font-semibold">Local:</span> {pelada.local}
            </p>
          </div>
          <div className="linha-campo my-3 rounded-full" />
          <p className="text-center font-bold text-grama-700">
            {confirmadosCount} / {pelada.limite_jogadores} jogadores
          </p>
          {lotada && <p className="text-center text-barro text-sm font-semibold mt-1">Pelada lotada — você entra na lista de espera</p>}
          {!lotada && <p className="text-center text-carvao/50 text-sm mt-1">{vagasDisponiveis} vagas disponíveis</p>}
        </div>

        {etapa === 'pergunta' && (
          <div className="text-center">
            <p className="font-semibold mb-4 text-lg">Você vai jogar?</p>
            <div className="flex gap-3">
              <button onClick={() => escolher(true)} className="btn-primario flex-1">
                🟢 Vou jogar
              </button>
              <button onClick={() => escolher(false)} className="btn-secundario flex-1">
                🔴 Não vou
              </button>
            </div>
          </div>
        )}

        {etapa === 'formulario' && (
          <form onSubmit={confirmar} className="card space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nome</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
            </div>

            {vaiJogar && (
              <div>
                <label className="block text-sm font-semibold mb-2">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo('mensalista')}
                    className={tipo === 'mensalista' ? 'btn-primario flex-1' : 'btn-secundario flex-1'}
                  >
                    Mensalista
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('diarista')}
                    className={tipo === 'diarista' ? 'btn-primario flex-1' : 'btn-secundario flex-1'}
                  >
                    Diarista
                  </button>
                </div>
              </div>
            )}

            {erro && <p className="text-barro text-sm font-medium">{erro}</p>}

            <button className="btn-primario w-full" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Confirmar'}
            </button>
            <button type="button" onClick={() => setEtapa('pergunta')} className="text-sm text-carvao/50 w-full">
              Voltar
            </button>
          </form>
        )}

        {etapa === 'pronto' && (
          <div className="card text-center">
            <div className="text-4xl mb-2">{vaiJogar ? '✅' : '👋'}</div>
            {vaiJogar ? (
              <p className="font-bold text-grama-700">
                {entrouNaEspera ? 'Você entrou na lista de espera!' : 'Presença confirmada!'}
              </p>
            ) : (
              <p className="font-bold text-grama-700">Tudo bem, até a próxima!</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}