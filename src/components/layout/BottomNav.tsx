import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home' },
  { to: '/history', label: 'History' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 text-xs gap-1 min-h-[48px] justify-center ` +
            (isActive ? 'text-indigo-600 font-semibold' : 'text-gray-400')
          }
        >
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
