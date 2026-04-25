import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_OPTS    = ['inquiry','quoted','confirmed','active','completed','cancelled']
const CURRENCY_OPTS  = ['ZAR','USD','EUR','GBP']

const pillClass = s => ({
  inquiry:'pill-amber', quoted:'pill-blue', confirmed:'pill-green',
  active:'pill-blue', completed:'pill-gray', cancelled:'pill-red',
}[s] ?? 'pill-gray')

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [clients, setClients]   = useState([])
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow]   = useState(null)
  const [filter, setFilter]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm] = useState({
    client_id:'', arrival_date:'', departure_date:'', num_hunters:1,
    num_observers:0, status:'inquiry', ph_id:'', tracker_id:'',
    daily_rate_hunter:'', currency:'USD', deposit_amount:'',
    balance_due:'', total_quoted:'', accommodation_type:'', notes:'',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [bRes, cRes, uRes] = await Promise.all([
      supabase.from('bookings')
        .select('*, clients(full_name, country, client_type)')
        .order('arrival_date', { ascending: false })
        .limit(100),
      supabase.from('clients').select('id, full_name, country').order('full_name'),
      supabase.from('users').select('id, full_name, roles(name)').order('full_name'),
    ])
    setBookings(bRes.data ?? [])
    setClients(cRes.data ?? [])
    setUsers(uRes.data ?? [])
    setLoading(false)
  }

  const filtered = bookings.filter(b => {
    if (!filter) return true
    return (
      b.booking_ref?.toLowerCase().includes(filter.toLowerCase()) ||
      b.clients?.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
      b.status?.includes(filter.toLowerCase())
    )
  })

  function openAdd() {
    setEditRow(null)
    setForm({ client_id:'', arrival_date:'', departure_date:'', num_hunters:1,
      num_observers:0, status:'inquiry', ph_id:'', tracker_id:'',
      daily_rate_hunter:'', currency:'USD', deposit_amount:'',
      balance_due:'', total_quoted:'', accommodation_type:'', notes:'' })
    setError('')
    setShowModal(true)
  }

  function openEdit(b) {
    setEditRow(b)
    setForm({
      client_id: b.client_id ?? '', arrival_date: b.arrival_date ?? '',
      departure_date: b.departure_date ?? '', num_hunters: b.num_hunters ?? 1,
      num_observers: b.num_observers ?? 0, status: b.status ?? 'inquiry',
      ph_id: b.ph_id ?? '', tracker_id: b.tracker_id ?? '',
      daily_rate_hunter: b.daily_rate_hunter ?? '', currency: b.currency ?? 'USD',
      deposit_amount: b.deposit_amount ?? '', balance_due: b.balance_due ?? '',
      total_quoted: b.total_quoted ?? '', accommodation_type: b.accommodation_type ?? '',
      notes: b.notes ?? '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      num_hunters:      parseInt(form.num_hunters) || 1,
      num_observers:    parseInt(form.num_observers) || 0,
      daily_rate_hunter: form.daily_rate_hunter ? parseFloat(form.daily_rate_hunter) : null,
      deposit_amount:   form.deposit_amount  ? parseFloat(form.deposit_amount)  : null,
      balance_due:      form.balance_due     ? parseFloat(form.balance_due)     : null,
      total_quoted:     form.total_quoted    ? parseFloat(form.total_quoted)    : null,
      ph_id:      form.ph_id      || null,
      tracker_id: form.tracker_id || null,
    }
    const { error: err } = editRow
      ? await supabase.from('bookings').update(payload).eq('id', editRow.id)
      : await supabase.from('bookings').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    setShowModal(false)
    loadAll()
    setSaving(false)
  }

  const nights = (a, d) => {
    if (!a || !d) return 0
    return Math.max(0, Math.round((new Date(d) - new Date(a)) / 86400000))
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Bookings</h1><p>Hunting and accommodation booking pipeline</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Booking</button>
      </div>

      {/* Pipeline summary */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {STATUS_OPTS.map(s => {
          const count = bookings.filter(b => b.status === s).length
          return (
            <div key={s} onClick={() => setFilter(filter === s ? '' : s)}
              style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:500,
                cursor:'pointer', border:`1px solid ${filter===s?'#1B4332':'#E0DBD0'}`,
                background: filter===s ? '#1B4332' : '#fff',
                color: filter===s ? '#C9A96E' : '#1A1A1A' }}>
              {s} <strong>{count}</strong>
            </div>
          )
        })}
        <input className="form-input" placeholder="Search ref or client…" value={filter}
          onChange={e => setFilter(e.target.value)} style={{ marginLeft:'auto', maxWidth:200 }} />
      </div>

      <div className="table-wrap">
        {loading
          ? <p style={{ padding:20, color:'#6B7280' }}>Loading bookings…</p>
          : filtered.length === 0
            ? <div className="empty-state"><p>No bookings found</p><button className="btn btn-primary" onClick={openAdd}>Create first booking</button></div>
            : <table>
                <thead><tr>
                  <th>Ref</th><th>Client</th><th>Arrives</th><th>Nights</th>
                  <th>PH</th><th>Quoted</th><th>Balance</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  {filtered.map(b => (
                    <tr key={b.id}>
                      <td><strong style={{ fontFamily:'monospace', fontSize:11 }}>{b.booking_ref ?? '—'}</strong></td>
                      <td>
                        <strong>{b.clients?.full_name ?? '—'}</strong>
                        {b.clients?.country && <span style={{ display:'block', fontSize:10, color:'#6B7280' }}>{b.clients.country}</span>}
                      </td>
                      <td>{b.arrival_date ?? '—'}</td>
                      <td>{nights(b.arrival_date, b.departure_date)}</td>
                      <td style={{ fontSize:11 }}>
                        {users.find(u => u.id === b.ph_id)?.full_name ?? <span style={{ color:'#E67E22' }}>⚠ Unassigned</span>}
                      </td>
                      <td>{b.total_quoted ? `${b.currency} ${Number(b.total_quoted).toLocaleString()}` : '—'}</td>
                      <td style={{ color: b.balance_due > 0 ? '#C0392B' : '#27AE60', fontWeight:500 }}>
                        {b.balance_due > 0 ? `${b.currency} ${Number(b.balance_due).toLocaleString()}` : '✓ Paid'}
                      </td>
                      <td><span className={`pill ${pillClass(b.status)}`}>{b.status}</span></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
        }
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editRow ? `Edit ${editRow.booking_ref ?? 'Booking'}` : 'New Booking'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:12 }}>{error}</div>}

                <div className="section-title" style={{ marginBottom:8 }}>Client & Dates</div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Client *</label>
                    <select className="form-select" required value={form.client_id}
                      onChange={e => setForm(f => ({...f, client_id: e.target.value}))}>
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.country ? `— ${c.country}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Arrival Date *</label>
                    <input className="form-input" type="date" required value={form.arrival_date}
                      onChange={e => setForm(f => ({...f, arrival_date: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Departure Date *</label>
                    <input className="form-input" type="date" required value={form.departure_date}
                      onChange={e => setForm(f => ({...f, departure_date: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hunters</label>
                    <input className="form-input" type="number" min="1" value={form.num_hunters}
                      onChange={e => setForm(f => ({...f, num_hunters: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Observers</label>
                    <input className="form-input" type="number" min="0" value={form.num_observers}
                      onChange={e => setForm(f => ({...f, num_observers: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Accommodation</label>
                    <input className="form-input" value={form.accommodation_type}
                      onChange={e => setForm(f => ({...f, accommodation_type: e.target.value}))}
                      placeholder="e.g. Kudu Suite" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status}
                      onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                      {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="divider" />
                <div className="section-title" style={{ marginBottom:8 }}>Staff Assignment</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Professional Hunter</label>
                    <select className="form-select" value={form.ph_id}
                      onChange={e => setForm(f => ({...f, ph_id: e.target.value}))}>
                      <option value="">— Unassigned —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tracker</label>
                    <select className="form-select" value={form.tracker_id}
                      onChange={e => setForm(f => ({...f, tracker_id: e.target.value}))}>
                      <option value="">— Unassigned —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="divider" />
                <div className="section-title" style={{ marginBottom:8 }}>Financials</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={form.currency}
                      onChange={e => setForm(f => ({...f, currency: e.target.value}))}>
                      {CURRENCY_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Daily Rate (per hunter)</label>
                    <input className="form-input" type="number" min="0" value={form.daily_rate_hunter}
                      onChange={e => setForm(f => ({...f, daily_rate_hunter: e.target.value}))} placeholder="e.g. 350" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Quoted</label>
                    <input className="form-input" type="number" min="0" value={form.total_quoted}
                      onChange={e => setForm(f => ({...f, total_quoted: e.target.value}))} placeholder="e.g. 8200" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deposit Paid</label>
                    <input className="form-input" type="number" min="0" value={form.deposit_amount}
                      onChange={e => setForm(f => ({...f, deposit_amount: e.target.value}))} placeholder="e.g. 4100" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Balance Due</label>
                    <input className="form-input" type="number" min="0" value={form.balance_due}
                      onChange={e => setForm(f => ({...f, balance_due: e.target.value}))} placeholder="e.g. 4100" />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Internal Notes</label>
                    <textarea className="form-textarea" value={form.notes}
                      onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Internal notes…" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editRow ? 'Save Changes' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
