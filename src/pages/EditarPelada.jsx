import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function EditarPelada() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ nome: '', local: '', horario: '', limite_jogadores: '' })

  useEffect(() => {
    carregarPelada()
  }, [slug])

  async function carregarPelada() {
    const { data } = await supabase.from('peladas').select('*').eq('slug', slug).single()
    setFormData(data)
    setLoading(false)
  }

  async function atualizar(e) {
    e.preventDefault()
    await supabase.from('peladas').update(formData).eq('slug', slug)
    navigate(`/painel/${slug}`)
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="p-6 bg-giz min-h-screen">
      <h1 className="text-2xl font-bold text-grama-700 mb-4">Editar Pelada</h1>
      <form onSubmit={atualizar} className="space-y-4">
        <input 
          className="w-full p-3 border rounded" 
          value={formData.nome} 
          onChange={e => setFormData({...formData, nome: e.target.value})} 
          placeholder="Nome da pelada"
        />
        <input 
          className="w-full p-3 border rounded" 
          value={formData.local} 
          onChange={e => setFormData({...formData, local: e.target.value})} 
          placeholder="Local"
        />
        <input 
          type="time"
          className="w-full p-3 border rounded" 
          value={formData.horario} 
          onChange={e => setFormData({...formData, horario: e.target.value})}
        />
        <input 
          type="number"
          className="w-full p-3 border rounded" 
          value={formData.limite_jogadores} 
          onChange={e => setFormData({...formData, limite_jogadores: e.target.value})} 
          placeholder="Limite de jogadores"
        />
        <button className="btn-primario w-full">Salvar Alterações</button>
      </form>
    </div>
  )
}