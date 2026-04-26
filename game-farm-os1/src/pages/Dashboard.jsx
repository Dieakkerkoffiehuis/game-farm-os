import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats]     = useState({ animals: 0, bookings: 0, balance: 0, tasks: 0 })
  const [upcoming, setUpcoming] = useState([])
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const next30 = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]

    const [animalsRes, bookingsRes, tasksRes, upcomingRes] = await Promise.all([
      supabase.from('animals').select('id', { count: 'exact' }).not('status','eq','deceased'),
      supabase.from('bookings').select('balance_due').in('status',['confirmed','active']),
      supabase.from('tasks').select('id', { count: 'exact' }).eq('status','pending'),
      supabase.from('bookings')
        .select('booking_ref, arrival_date, departure_date, status, clients(full_name, country)')
        .gte('arrival_date', today)
        .lte('arrival_date', next30)
        .not('status','eq','cancelled')
        .order('arrival_date')
        .limit(6),
    ])

    const totalBalance = (bookingsRes.data ?? [])
      .reduce((sum, b) => sum + (b.balance_due ?? 0), 0)

    setStats({
      animals:  animalsRes.count ?? 0,
      bookings: bookingsRes.data?.length ?? 0,
      balance:  totalBalance,
      tasks:    tasksRes.count ?? 0,
    })
    setUpcoming(upcomingRes.data ?? [])

    // Build alerts
    const newAlerts = []
    if (totalBalance > 0)
      newAlerts.push({ type: 'amber', text: `R${totalBalance.toLocaleString()} outstanding across ${bookingsRes.data?.length} active bookings` })
    if ((tasksRes.count ?? 0) > 0)
      newAlerts.push({ type: 'amber', text: `${tasksRes.count} staff tasks pending` })
    if (newAlerts.length === 0)
      newAlerts.push({ type: 'green', text: 'All systems operational — no outstanding alerts' })
    setAlerts(newAlerts)
    setLoading(false)
  }

  const statusPill = s => {
    const map = { confirmed:'pill-green', active:'pill-blue', inquiry:'pill-amber', completed:'pill-gray', cancelled:'pill-red' }
    return <span className={`pill ${map[s] ?? 'pill-gray'}`}>{s}</span>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'}. Here's today's overview.</p>
        </div>
        <button className="btn btn-primary" onClick={loadDashboard}>↻ Refresh</button>
      </div>

      {/* Metric cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Animals</div>
          <div className="metric-value">{loading ? '—' : stats.animals}</div>
          <div className="metric-sub">Live animals on farm</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Bookings</div>
          <div className="metric-value">{loading ? '—' : stats.bookings}</div>
          <div className="metric-sub">Confirmed + active</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Outstanding Balance</div>
          <div className="metric-value" style={{ fontSize: stats.balance > 0 ? 18 : 24, color: stats.balance > 0 ? '#C0392B' : '#1B4332' }}>
            {loading ? '—' : `R${stats.balance.toLocaleString()}`}
          </div>
          <div className="metric-sub">{stats.balance > 0 ? <span className="metric-down">Needs collection</span> : 'All paid up'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending Tasks</div>
          <div className="metric-value" style={{ color: stats.tasks > 0 ? '#E67E22' : '#1B4332' }}>
            {loading ? '—' : stats.tasks}
          </div>
          <div className="metric-sub">Staff tasks today</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Upcoming hunts */}
        <div className="card">
          <div className="card-title">
            Upcoming Bookings (next 30 days)
            <span style={{ fontSize: 11, fontWeight: 400, color: '#6B7280' }}>{upcoming.length} found</span>
          </div>
          {loading ? <p style={{ color: '#6B7280', fontSize: 12 }}>Loading...</p>
          : upcoming.length === 0
            ? <div className="empty-state"><p>No upcoming bookings</p></div>
            : <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr><th>Client</th><th>Arrives</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {upcoming.map(b => (
                      <tr key={b.booking_ref}>
                        <td>
                          <strong>{b.clients?.full_name ?? '—'}</strong>
                          {b.clients?.country && <span style={{ fontSize: 10, color: '#6B7280', display: 'block' }}>{b.clients.country}</span>}
                        </td>
                        <td>{b.arrival_date}</td>
                        <td>{statusPill(b.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="card-title">Alerts</div>
          {alerts.map((a, i) => (
            <div key={i} className={`alert-row alert-${a.type}`}>
              <span>{a.type === 'red' ? '🔴' : a.type === 'amber' ? '🟡' : '🟢'}</span>
              <span>{a.text}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '10px 0', borderTop: '0.5px solid #f0ebe0' }}>
            <p style={{ fontSize: 11, color: '#6B7280' }}>
              Last refreshed: {new Date().toLocaleTimeString('en-ZA')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
