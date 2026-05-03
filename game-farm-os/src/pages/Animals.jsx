import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_OPTS = ['huntable','breeding','quarantine','relocated','sold','deceased','harvested','wounded']
const SEX_OPTS    = ['male','female','unknown']

const pillClass = s => ({
  huntable:'pill-green', breeding:'pill-purple', quarantine:'pill-amber',
  sold:'pill-gray', deceased:'pill-red', relocated:'pill-blue',
}[s] ?? 'pill-gray')

export default function Animals() {
  const [animals, setAnimals]   = useState([])
  const [species, setSpecies]   = useState([])
  const [camps, setCamps]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow]   = useState(null)
  const [filters, setFilters]   = useState({ search:'', species_id:'', camp_id:'', status:'' })
  const [form, setForm]         = useState({
    animal_code:'', species_id:'', sex:'male', estimated_age:'',
    camp_id:'', status:'huntable', tag_number:'', estimated_value:'',
    purchase_price:'', notes:'',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [aRes, sRes, cRes] = await Promise.all([
      supabase.from('animals')
        .select('*, species(name), camps(name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('species').select('id, name').order('name'),
      supabase.from('camps').select('id, name').order('name'),
    ])
    setAnimals(aRes.data ?? [])
    setSpecies(sRes.data ?? [])
    setCamps(cRes.data ?? [])
    setLoading(false)
  }

  const filtered = animals.filter(a => {
    if (filters.search && !a.animal_code?.toLowerCase().includes(filters.search.toLowerCase())
      && !a.tag_number?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.species_id && a.species_id !== filters.species_id) return false
    if (filters.camp_id    && a.camp_id    !== filters.camp_id)    return false
    if (filters.status     && a.status     !== filters.status)     return false
    return true
  })

  function openAdd() {
    setEditRow(null)
    setForm({ animal_code:'', species_id:'', sex:'male', estimated_age:'',
      camp_id:'', status:'huntable', tag_number:'', estimated_value:'',
      purchase_price:'', notes:'' })
    setError('')
    setShowModal(true)
  }

  function openEdit(a) {
    setEditRow(a)
    setForm({
      animal_code: a.animal_code ?? '', species_id: a.species_id ?? '',
      sex: a.sex ?? 'male', estimated_age: a.estimated_age ?? '',
      camp_id: a.camp_id ?? '', status: a.status ?? 'huntable',
      tag_number: a.tag_number ?? '', estimated_value: a.estimated_value ?? '',
      purchase_price: a.purchase_price ?? '', notes: a.notes ?? '',
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
      estimated_age:   form.estimated_age   ? parseFloat(form.estimated_age)   : null,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      purchase_price:  form.purchase_price  ? parseFloat(form.purchase_price)  : null,
    }
    const { error: err } = editRow
      ? await supabase.from('animals').update(payload).eq('id', editRow.id)
      : await supabase.from('animals').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    setShowModal(false)
    loadAll()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Mark this animal as deceased?')) return
    await supabase.from('animals').update({ status:'deceased' }).eq('id', id)
    loadAll()
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Animals</h1><p>Wildlife inventory across all camps</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Animal</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input className="form-input" placeholder="Search code or tag…"
          value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="form-select" value={filters.species_id}
          onChange={e => setFilters(f => ({...f, species_id: e.target.value}))}>
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="form-select" value={filters.camp_id}
          onChange={e => setFilters(f => ({...f, camp_id: e.target.value}))}>
          <option value="">All Camps</option>
          {camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-select" value={filters.status}
          onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
          <option value="">All Status</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize:11, color:'#6B7280', marginLeft:'auto' }}>{filtered.length} animals</span>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading
          ? <p style={{ padding:20, color:'#6B7280' }}>Loading animals…</p>
          : filtered.length === 0
            ? <div className="empty-state"><p>No animals found</p><button className="btn btn-primary" onClick={openAdd}>Add first animal</button></div>
            : <table>
                <thead><tr>
                  <th>Code</th><th>Species</th><th>Sex</th><th>Age</th>
                  <th>Tag</th><th>Camp</th><th>Status</th><th>Value (R)</th><th></th>
                </tr></thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.animal_code}</strong></td>
                      <td>{a.species?.name ?? '—'}</td>
                      <td style={{ textTransform:'capitalize' }}>{a.sex}</td>
                      <td>{a.estimated_age ? `${a.estimated_age}y` : '—'}</td>
                      <td>{a.tag_number ?? '—'}</td>
                      <td>{a.camps?.name ?? '—'}</td>
                      <td><span className={`pill ${pillClass(a.status)}`}>{a.status}</span></td>
                      <td>{a.estimated_value ? `R${Number(a.estimated_value).toLocaleString()}` : '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)} style={{ marginRight:4 }}>Edit</button>
                        <button className="btn btn-sm" style={{ background:'#FDECEA', color:'#C0392B', border:'none' }}
                          onClick={() => handleDelete(a.id)}>✕</button>
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
              <h3>{editRow ? 'Edit Animal' : 'Add New Animal'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:12 }}>{error}</div>}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Animal Code *</label>
                    <input className="form-input" required value={form.animal_code}
                      onChange={e => setForm(f => ({...f, animal_code: e.target.value}))}
                      placeholder="e.g. IMP-2024-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Species *</label>
                    <select className="form-select" required value={form.species_id}
                      onChange={e => setForm(f => ({...f, species_id: e.target.value}))}>
                      <option value="">Select species</option>
                      {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sex</label>
                    <select className="form-select" value={form.sex}
                      onChange={e => setForm(f => ({...f, sex: e.target.value}))}>
                      {SEX_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Age (years)</label>
                    <input className="form-input" type="number" step="0.5" min="0" value={form.estimated_age}
                      onChange={e => setForm(f => ({...f, estimated_age: e.target.value}))} placeholder="e.g. 4" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Camp</label>
                    <select className="form-select" value={form.camp_id}
                      onChange={e => setForm(f => ({...f, camp_id: e.target.value}))}>
                      <option value="">Select camp</option>
                      {camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status}
                      onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                      {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tag Number</label>
                    <input className="form-input" value={form.tag_number}
                      onChange={e => setForm(f => ({...f, tag_number: e.target.value}))} placeholder="e.g. A-047" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Value (R)</label>
                    <input className="form-input" type="number" min="0" value={form.estimated_value}
                      onChange={e => setForm(f => ({...f, estimated_value: e.target.value}))} placeholder="e.g. 4200" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Price (R)</label>
                    <input className="form-input" type="number" min="0" value={form.purchase_price}
                      onChange={e => setForm(f => ({...f, purchase_price: e.target.value}))} placeholder="e.g. 3500" />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes}
                      onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Any additional notes…" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editRow ? 'Save Changes' : 'Add Animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
