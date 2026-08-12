import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [peladas, setPeladas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [copiado, setCopiado] = useState('')
  const [temLicenca, setTemLicenca] = useState(false)

  useEffect(() => {
    if (user) {
      verificarLicencaEBuscarPeladas()
    }
  }, [user])

  async function verificarLicencaEBuscarPeladas() {
    setCarregando(true)

    // 1. Verifica se o usuário ativou alguma licença com o e-mail dele
    const { data: licencaData } = await supabase
      .from('licencas')
      .select('*')
      .eq('comprador_email', user.email)
      .eq('utilizada', true)
      .maybeSingle()

    if (licencaData) {
      setTemLicenca(true)
    }

    // 2. Busca as peladas do usuário
    const { data: listaPeladas } = await supabase
      .from('peladas')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    // Para cada pelada, busca quantos jogadores confirmaram presença
    const comContagem = await Promise.all(
      (listaPeladas ?? []).map(async (pelada) => {
        const { count } = await supabase
          .from('participantes')
          .select('*', { count: 'exact', head: true })
          .eq('pelada_id', pelada.id)
          .eq('status_presenca', 'confirmado')
        return { ...pelada, confirmados: count ?? 0 }
      })
    )

    setPeladas(comContagem)
    setCarregando(false)
  }

  function copiarLink(slug) {
    const url = `${window.location.origin}/${slug}`
    navigator.clipboard.writeText(url)
    setCopiado(slug)
    setTimeout(() => setCopiado(''), 2000)
  }

  async function sair() {
    await supabase.auth.signOut()
    navigate('/entrar')
  }

  function formatarData(pelada) {
    if (pelada.tipo_evento === 'recorrente') {
      return `Toda(o) ${pelada.dia_semana}`
    }
    if (!pelada.data) return ''
    const [ano, mes, dia] = pelada.data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  return (
    <div className="min-h-screen bg-giz pb-24">
      <header className="bg-grama-700 text-giz px-6 pt-8 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-grama-100 text-sm">Olá!</p>
            <h1 className="text-xl font-bold">Minhas peladas</h1>
          </div>
          <button onClick={sair} className="text-sm text-grama-100 underline">
            Sair
          </button>
        </div>
      </header>

      <main className="px-5 -mt-3">
        {/* AVISO SE NÃO TIVER LICENÇA ATIVADA */}
        {!carregando && !temLicenca && (
          <div className="card bg-amber-50 border border-amber-300 mb-4 text-center">
            <p className="font-bold text-amber-800 mb-1">⚠️ Conta não ativada</p>
            <p className="text-sm text-carvao/70 mb-3">
              Para criar e gerenciar suas peladas, insira sua chave serial de ativação.
            </p>
            <Link to="/ativar" className="btn-primario inline-block text-sm py-2 px-4">
              Ativar com Chave Serial (FM-...)
            </Link>
          </div>
        )}

        {carregando && <p className="text-center text-carvao/60 mt-10">Carregando...</p>}

        {!carregando && peladas.length === 0 && (
          <div className="card text-center mt-6">
            <div className="text-3xl mb-2">🏟️</div>
            <p className="text-carvao/70 mb-4">Você ainda não criou nenhuma pelada.</p>
            {temLicenca ? (
              <Link to="/painel/nova" className="btn-primario">
                + Criar pelada
              </Link>
            ) : (
              <button
                onClick={() => alert('Ative sua conta com a chave serial (FM-...) para criar peladas.')}
                className="btn-primario opacity-50 cursor-not-allowed w-full"
              >
                + Criar pelada (Bloqueado)
              </button>
            )}
          </div>
        )}

        <div className="space-y-4 mt-4">
          {peladas.map((pelada) => (
            <div key={pelada.id} className="card">
              <h2 className="font-bold text-lg text-grama-700">⚽ {pelada.nome}</h2>
              <p className="text-carvao/70 text-sm mt-1">
                {formatarData(pelada)} · {pelada.horario?.slice(0, 5)}
              </p>
              <p className="text-carvao/70 text-sm">{pelada.local}</p>

              <div className="linha-campo my-3 rounded-full" />

              <p className="font-semibold text-grama-700 mb-3">
                {pelada.confirmados} / {pelada.limite_jogadores} jogadores confirmados
              </p>

              <div className="flex gap-2">
                <button onClick={() => navigate(`/painel/${pelada.slug}`)} className="btn-primario flex-1">
                  Abrir
                </button>
                <button onClick={() => copiarLink(pelada.slug)} className="btn-secundario flex-1">
                  {copiado === pelada.slug ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* BOTÃO FLUTUANTE DE CRIAR (Só aparece se tiver licença) */}
      {!carregando && peladas.length > 0 && (
        temLicenca ? (
          <Link
            to="/painel/nova"
            className="fixed bottom-6 right-6 btn-primario shadow-lg rounded-full h-14 w-14 text-2xl flex items-center justify-center p-0"
            aria-label="Criar pelada"
          >
            +
          </Link>
        ) : (
          <button
            onClick={() => alert('Ative sua conta com a chave serial (FM-...) para criar peladas.')}
            className="fixed bottom-6 right-6 btn-primario shadow-lg rounded-full h-14 w-14 text-2xl flex items-center justify-center p-0 opacity-7autan"
            aria-label="Criar pelada bloqueado"
          >
            🔒
          </button>
        )
      )}
    </div>
  )
}