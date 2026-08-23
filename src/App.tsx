import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { InicioPage } from './pages/InicioPage'
import { TarefasPage } from './pages/TarefasPage'
import { FinalizadasPage } from './pages/FinalizadasPage'
import { WhatsAppPage } from './pages/WhatsAppPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/inicio" element={<InicioPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tarefas" element={<TarefasPage />} />
            <Route path="/tarefas/finalizadas" element={<FinalizadasPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/integracoes/whatsapp" element={<WhatsAppPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
