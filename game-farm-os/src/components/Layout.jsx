import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  ]},
  { section: 'Wildlife', items: [
    { to: '/animals', icon: '◈', label: 'Animals' },
    { to: '/camps',   icon: '▦', label: 'Camps' },
  ]},
  { section: 'Hunting', items: [
    { to: '/bookings', icon: '📋', label: 'Bookings' },
    { to: '/hunts',    icon: '◎', label: 'Hunt Log' },
  ]},
  { section: 'Operations', items: [
    { to: '/finance', icon: 'R$', label: 'Finance' },
    { to: '/staff',   icon: '▣', label: 'Staff & Tasks' },
  ]},
  { section: 'System', items: [
    { to: '/settings', icon: '⚙', label: 'Settings' },
  ]},
]

export default function Layout() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : '?'

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-title">GAME FARM OS</div>
          <div className="sidebar-logo-sub">Farm Management</div>
        </div>

        {NAV.map(group => (
          <div className="sidebar-section" key={group.section}>
            <div className="sidebar-label">{group.section}</div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-item${isActive ? ' active' : ''}`
                }
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-bottom">
          <button className="sidebar-item" onClick={handleSignOut} style={{ width: '100%' }}>
            <span className="sidebar-icon">⇥</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title" id="page-title">Game Farm OS</div>
          <div className="topbar-right">
            <div className="user-chip">
              <div className="user-avatar">{initials}</div>
              <span className="user-name">
                {profile?.full_name ?? 'User'} · {role ?? '—'}
              </span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
