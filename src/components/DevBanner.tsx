import { useEffect } from 'react'
import { onValue, seedVersionRef } from '../services/firebase'
import { useAuthContext } from '../contexts/AuthContext'
import { localDB } from '../services/db'

const isDev = import.meta.env.VITE_USE_EMULATOR === 'true'
const SEED_VERSION_KEY = 'lastSeedVersion'

export default function DevBanner() {
  const { user } = useAuthContext()

  useEffect(() => {
    if (!isDev) return
    const original = document.title
    if (!original.startsWith('[DEV]')) {
      document.title = '[DEV] ' + original
    }
    return () => { document.title = original }
  }, [])

  useEffect(() => {
    if (!isDev || !user) return
    return onValue(seedVersionRef(user.uid), async snap => {
      const version = snap.val() as number | null
      if (!version) return
      const last = localStorage.getItem(SEED_VERSION_KEY)
      if (last === String(version)) return
      localStorage.setItem(SEED_VERSION_KEY, String(version))
      await localDB.sessions.clear()
      await localDB.sets.clear()
      await localDB.profile.clear()
      await localDB.treatment.clear()
      window.location.reload()
    })
  }, [user])

  if (!isDev) return null

  return (
    <div style={{
      background: 'rgba(252, 211, 77, 0.12)',
      borderBottom: '1px solid rgba(252, 211, 77, 0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '5px 12px',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#FCD34D',
        boxShadow: '0 0 6px #FCD34D',
        display: 'inline-block',
        animation: 'dev-banner-pulse 1.4s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <span style={{
        color: '#FCD34D',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        Developer Mode
      </span>
      <style>{`
        @keyframes dev-banner-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
