import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TYPE_OPTS     = ['income','expense']
const CATEGORY_OPTS = ['hunt_fee','accommodation','trophy_fee','permits','staff_wages','feed','vet','maintenance','fuel','equipment','other']
const CURRENCY_OPTS = ['ZAR','USD','EUR','GBP']

const pillClass = t => t === 'income' ? 'pill-green' : 'pill-red'

export default function Finance() {
  const [transactions, setTransactions] = useState([])
  const [bookings, setBookings]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [editRow, setEditRow]           = useState(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [filters, setFilters]           = useState({ type:'', category:'', search:'' })
  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'income', category: 'hunt_fee', description: '',
    amount: '', currency: 'ZAR', booking_id: '',
    reference_number: '', payment_method: '', notes: '',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [tRes, bRes] = await Promise.all([
      supabase.from('transactions')
        .select('*, bookings(booking_ref, clients(full_name))')
        .order('transaction_date', { ascending: false })
        .limit(200),
      supabase.from('bookings')
        .select('id, booking_ref, clients(full_name)')
        .in('status', ['confirmed','active','completed'])
        .order('arrival_date', { ascending: false }),
    ])
    setTransactions(tRes.data ?? [])
    setBookings(bRes.data ?? [])
    setLoading(false)
  }

  const filtered = transactions.filter(t => {
    if (filters.type     && t.type     !== filters.type)     return false
    if (filters.category && t.category !== filters.category) return false
    if (filters.search && !t.description?.toLowerCase().includes(filters.search.toLowerCase())
      && !t.reference_number?.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)
  const netProfit    = totalIncome - totalExpense

  function openAdd() {
    setEditRow(null)
    setForm({
      transaction_date: new Date().toISOString().split('T')[0],
      type: 'income', category: 'hunt_fee', description: '',
      amount: '', currency: 'ZAR', booking_id: '',
      reference_number: '', payment_method: '', notes: '',
    })
    setError('')
    setShowModal(true)
  }

  function openEdit(t) {
    setEditRow(t)
    setForm({
      transaction_date: t.transaction_date ?? '',
      type: t.type ?? 'income', category: t.category ?? 'hunt_fee',
      description: t.description ?? '', amount: t.amount ?? '',
      currency: t.currency ?? 'ZAR', booking_id: t.booking_id ?? '',
      reference_number: t.reference_number ?? '',
      payment_method: t.payment_method ?? '', notes: t.notes ?? '',
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
      amount: form.amount ? parseFloat(form.amount) : null,
      booking_id: form.booking_id || null,
    }
    const { error: err } = editRow
      ? await supabase.from('transactions').update(payload).eq('id', editRow.id)
      : await supabase.from('transactions').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    setShowModal(false)
    loadAll()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction? This cannot be undone.')) return
    await supabase.from('transactions').delete().eq('id', id)
    loadAll()
  }

  const fmtCurrency = (amount, currency = 'ZAR') => {
    const symbol = { ZAR:'R', USD:'$', EUR:'€', GBP:'£' }[currency] ?? currency
    return `${symbol}${Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Finance</h1><p>Income, expenses and farm financial overview</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Transaction</button>
      </div>

      {/* Summary cards */}
      <div className="metrics-grid" style={{ marginBottom: 16 }}>
        <div className="metric-card">
          <div className="metric-label">Total Income</div>
          <div className="metric-value" style={{ color:'#1A7A3A', fontSize:20 }}>{fmtCurrency(totalIncome)}</div>
          <div className="metric-sub">{filtered.filter(t => t.type==='income').length} transactions</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Expenses</div>
          <div className="metric-value" style={{ color:'#C0392B', fontSize:20 }}>{fmtCurrency(totalExpense)}</div>
          <div className="metric-sub">{filtered.filter(t => t.type==='expense').length} transactions</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Net Profit</div>
          <div className="metric-value" style={{ color: netProfit >= 0 ? '#1B4332' : '#C0392B', fontSize:20 }}>
            {fmtCurrency(Math.abs(netProfit))}
          </div>
          <div className="metric-sub">{netProfit < 0 ? <span style={{ color:'#C0392B' }}>Net loss</span> : 'Profitable'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Margin</div>
          <div className="metric-value" style={{ color: netProfit >= 0 ? '#1B4332' : '#C0392B', fontSize:22 }}>
            {totalIncome > 0 ? `${Math.round((netProfit/totalIncome)*100)}%` : '—'}
          </div>
          <div className="metric-sub">Of filtered income</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="form-select" value={filters.type}
          onChange={e => setFilters(f => ({...f, type: e.target.value}))}>
          <option value="">All Types</option>
          {TYPE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-select" value={filters.category}
          onChange={e => setFilters(f => ({...f, category: e.target.value}))}>
          <option value="">All Categories</option>
          {CATEGORY_OPTS.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
        </select>
        <input className="form-input" placeholder="Search description or ref…"
          value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <span style={{ fontSize:11, color:'#6B7280', marginLeft:'auto' }}>{filtered.length} transactions</span>
      </div>

      <div className="table-wrap">
        {loading
          ? <p style={{ padding:20, color:'#6B7280' }}>Loading transactions…</p>
          : filtered.length === 0
            ? <div className="empty-state"><p>No transactions found</p><button className="btn btn-primary" onClick={openAdd}>Add first transaction</button></div>
            : <table>
                <thead><tr>
                  <th>Date</th><th>Type</th><th>Category</th><th>Description</th>
                  <th>Booking</th><th>Amount</th><th>Ref</th><th></th>
                </tr></thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id}>
                      <td>{t.transaction_date}</td>
                      <td><span className={`pill ${pillClass(t.type)}`}>{t.type}</span></td>
                      <td style={{ fontSize:11, textTransform:'capitalize' }}>{t.category?.replace(/_/g,' ')}</td>
                      <td><strong>{t.description}</strong></td>
                      <td style={{ fontSize:11 }}>{t.bookings?.booking_ref ?? '—'}</td>
                      <td style={{ fontWeight:600, color: t.type==='income' ? '#1A7A3A' : '#C0392B' }}>
                        {t.type === 'expense' ? '−' : '+'}{fmtCurrency(t.amount ?? 0, t.currency)}
                      </td>
                      <td style={{ fontSize:10, color:'#6B7280', fontFamily:'monospace' }}>{t.reference_number ?? '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} style={{ marginRight:4 }}>Edit</button>
                        <button className="btn btn-sm" style={{ background:'#FDECEA', color:'#C0392B', border:'none' }}
                          onClick={() => handleDelete(t.id)}>✕</button>
                      </td>
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
              <h3>{editRow ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:12 }}>{error}</div>}

                {/* Income / Expense toggle */}
                <div style={{ marginBottom:14 }}>
                  <div className="form-label" style={{ marginBottom:8 }}>Type *</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {TYPE_OPTS.map(t => (
                      <button type="button" key={t} onClick={() => setForm(f => ({...f, type:t}))}
                        style={{
                          flex:1, padding:'10px 4px', borderRadius:8, fontSize:13, fontWeight:600,
                          border: form.type === t ? '2px solid #1B4332' : '1px solid #E0DBD0',
                          background: form.type === t ? (t==='income' ? '#D5F0E0' : '#FDECEA') : '#fff',
                          color: form.type === t ? (t==='income' ? '#1A7A3A' : '#C0392B') : '#6B7280',
                          textTransform:'capitalize',
                        }}>
                        {t === 'income' ? '↑ Income' : '↓ Expense'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input className="form-input" type="date" required value={form.transaction_date}
                      onChange={e => setForm(f => ({...f, transaction_date: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-select" required value={form.category}
                      onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                      {CATEGORY_OPTS.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Description *</label>
                    <input className="form-input" required value={form.description}
                      onChange={e => setForm(f => ({...f, description: e.target.value}))}
                      placeholder="e.g. Kudu trophy fee — Smith party" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={form.currency}
                      onChange={e => setForm(f => ({...f, currency: e.target.value}))}>
                      {CURRENCY_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount *</label>
                    <input className="form-input" type="number" min="0" step="0.01" required value={form.amount}
                      onChange={e => setForm(f => ({...f, amount: e.target.value}))} placeholder="e.g. 15000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Linked Booking</label>
                    <select className="form-select" value={form.booking_id}
                      onChange={e => setForm(f => ({...f, booking_id: e.target.value}))}>
                      <option value="">— None —</option>
                      {bookings.map(b => <option key={b.id} value={b.id}>{b.booking_ref} — {b.clients?.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <input className="form-input" value={form.payment_method}
                      onChange={e => setForm(f => ({...f, payment_method: e.target.value}))}
                      placeholder="e.g. EFT, Cash, Card" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference Number</label>
                    <input className="form-input" value={form.reference_number}
                      onChange={e => setForm(f => ({...f, reference_number: e.target.value}))}
                      placeholder="e.g. INV-2024-0042" />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes}
                      onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Additional notes…" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editRow ? 'Save Changes' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
