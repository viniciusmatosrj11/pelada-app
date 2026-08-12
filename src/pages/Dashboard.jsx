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

  useEffect(() => {
    if (user) carregarPeladas()
  }, [user])

  async function carregarPeladas() {
    setCarregando(true)
    const { data: listaPeladas } = await supabase
      .from('peladas')
      .select('*')
      .eq('owner_id', user.id)
      .order('data', { ascending: true })

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

  function formatarData(data) {
    if (!data) return ''
    const [ano, mes, dia] = data.split('-')
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
        {carregando && <p className="text-center text-carvao/60 mt-10">Carregando...</p>}

        {!carregando && peladas.length === 0 && (
          <div className="card text-center mt-6">
            <div className="text-3xl mb-2">🏟️</div>
            <p className="text-carvao/70 mb-4">Você ainda não criou nenhuma pelada.</p>
            <Link to="/painel/nova" className="btn-primario">
              + Criar pelada
            </Link>
          </div>
        )}

        <div className="space-y-4 mt-4">
          {peladas.map((pelada) => (
            <div key={pelada.id} className="card">
              <h2 className="font-bold text-lg text-grama-700">⚽ {pelada.nome}</h2>
              <p className="text-carvao/70 text-sm mt-1">
                {formatarData(pelada.data)} · {pelada.horario?.slice(0, 5)}
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

      {peladas.length > 0 && (
        <Link
          to="/painel/nova"
          className="fixed bottom-6 right-6 btn-primario shadow-lg rounded-full h-14 w-14 text-2xl p-0"
          aria-label="Criar pelada"
        >
          +
        </Link>
      )}
    </div>
  )
}
