import { useLocation, useNavigate } from 'react-router-dom'
import { setNavDirection } from '../../navDirection'
import { useAuthContext } from '../../contexts/AuthContext'

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12L12 3l9 9"/><path d="M5 10v10h5v-6h4v6h5V10"/>
  </svg>
)
const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
  </svg>
)
const ReportsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6"/>
  </svg>
)
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const NAV_TABS = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/history', label: 'History', Icon: HistoryIcon },
  { to: '/reports', label: 'Reports', Icon: ReportsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

const NAV_ORDER = NAV_TABS.map(t => t.to)

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const handleNav = (to: string) => {
    if (to === location.pathname) return
    const fromIdx = NAV_ORDER.indexOf(location.pathname)
    const toIdx = NAV_ORDER.indexOf(to)
    setNavDirection(toIdx > fromIdx ? 'right' : 'left')
    navigate(to)
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50,
    }}>
      {NAV_TABS.map(({ to, label, Icon }) => {
        const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
        const isSettings = to === '/settings'
        return (
          <button
            key={to}
            onClick={() => handleNav(to)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', textDecoration: 'none',
            }}
          >
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0 14px', gap: 4,
              color: isActive ? 'var(--cyan)' : 'var(--text-faint)',
              transition: 'color 0.2s',
              position: 'relative',
            }}>
              {isActive && (
                <span style={{
                  position: 'absolute', top: 0,
                  width: 24, height: 2,
                  background: 'var(--cyan)',
                  borderRadius: 1,
                  boxShadow: '0 0 8px var(--cyan-glow)',
                }} />
              )}
              {isSettings && user?.photoURL
                ? <img
                    src={user.photoURL}
                    alt=""
                    style={{
                      width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
                      border: `1.5px solid ${isActive ? 'var(--cyan)' : 'var(--text-faint)'}`,
                      boxShadow: isActive ? '0 0 6px var(--cyan-glow)' : 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                  />
                : <Icon />
              }
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 600 : 400, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
              </span>
            </div>
          </button>
        )
      })}
    </nav>
  )
}
