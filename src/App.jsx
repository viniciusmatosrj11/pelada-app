import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CriarPelada from './pages/CriarPelada.jsx'
import PeladaAdmin from './pages/PeladaAdmin.jsx'
import PeladaPublica from './pages/PeladaPublica.jsx'
import RotaProtegida from './components/RotaProtegida.jsx'

export default function App() {
  return (
    <Routes>
      {/* Área do dono da pelada */}
      <Route path="/entrar" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route
        path="/painel"
        element={
          <RotaProtegida>
            <Dashboard />
          </RotaProtegida>
        }
      />
      <Route
        path="/painel/nova"
        element={
          <RotaProtegida>
            <CriarPelada />
          </RotaProtegida>
        }
      />
      <Route
        path="/painel/:slug"
        element={
          <RotaProtegida>
            <PeladaAdmin />
          </RotaProtegida>
        }
      />

      {/* Página raiz redireciona para o login */}
      <Route path="/" element={<Login />} />

      {/* Link público que o dono compartilha no WhatsApp: pelada.com/xxxxx */}
      <Route path="/:slug" element={<PeladaPublica />} />
    </Routes>
  )
}
