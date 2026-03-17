import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { SyncProvider } from './contexts/SyncContext'
import AppShell from './components/layout/AppShell'
import LoginView from './views/LoginView'
import HomeView from './views/HomeView'
import HistoryView from './views/HistoryView'
import ReportsView from './views/ReportsView'
import SettingsPageView from './views/SettingsView'
import OnboardingView from './views/OnboardingView'

function AuthenticatedApp() {
  const { user, loading } = useAuthContext()
  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>
  )
  if (!user) return <LoginView />

  return (
    <DataProvider uid={user.uid}>
      <SyncProvider uid={user.uid}>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/settings" element={<SettingsPageView />} />
            <Route path="/onboarding" element={<OnboardingView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </SyncProvider>
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
