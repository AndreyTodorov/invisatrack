import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { getNavDirection } from './navDirection'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AppShell from './components/layout/AppShell'
import LoginView from './views/LoginView'
import HomeView from './views/HomeView'
import HistoryView from './views/HistoryView'
import ReportsView from './views/ReportsView'
import SettingsPageView from './views/SettingsView'
import OnboardingView from './views/OnboardingView'

function AnimatedRoutes() {
  const location = useLocation()
  const dir = getNavDirection()
  const enterClass = dir ? `tab-enter-${dir}` : ''

  return (
    <div key={location.pathname} className={enterClass}>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/reports" element={<ReportsView />} />
        <Route path="/settings" element={<SettingsPageView />} />
        <Route path="/onboarding" element={<OnboardingView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function AuthenticatedApp() {
  const { user, loading } = useAuthContext()
  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>
  )
  if (!user) return <LoginView />

  return (
    <DataProvider uid={user.uid}>
      <ThemeProvider>
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </ThemeProvider>
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}
