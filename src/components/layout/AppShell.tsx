import type { ReactNode } from 'react'
import BottomNav from './BottomNav'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <main className="flex-1 pb-20 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
