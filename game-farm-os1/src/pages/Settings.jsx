import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const [tab, setTab] = useState('species')

  return (
    <div>
      <div className="page-header">
        <div><h1>Settings</h1><p>Manage species, camps and farm reference data</p></div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid #E0DBD0' }}>
        {[['species','🦌 Species'], ['camps','🏕️ Camps']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding:'8px 20px', background:'none', border:'none',
              borderRadius:'6px 6px 0 0',
              borderBottom: tab===key ? '2px solid #1B4332' : '2px solid transparent',
              fontWeight: tab===key ? 700 : 400,
              color: tab===key ? '#1B4332' : '#6B7280',
              cursor:'pointer', fontSize:13,
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'species' && <SpeciesManager />}
      {tab === 'camps'   && <CampsManager />}
    </div>
  )
}

/* ─── SPECIES MANAGER ─── */
function SpeciesManager() {
  const [species, setSpecies]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [form, setForm] = useState({ name:'', category:'', notes:'' })

  useEffect(() => { loadSpecies() }, [])

  async function loadSpecies() {
    setLoading(true)
    const { data } = await supabase.from('species').select('*').order('name')
    setSpecies(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditRow(null)
    setForm({ name:'', category:'', notes:'' })
    setError('')
    setShowModal(true)
  }

  function openEdit(s) {
    setEditRow(s)
    setForm({ name: s.name ?? '', category: s.category ?? '', notes: s.notes ?? '' })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = editRow
      ? await supabase.from('species').update(form).eq('id', editRow.id)
      : await supabase.from('species').insert(form)
    if (err) { setError(err.message); setSaving(false); return }
    setShowModal(false)
    loadSpecies()
    setSaving(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await supabase.from('species').delete().eq('id', id)
    loadSpecies()
  }

  const COMMON_SPECIES = [
    'Impala','Kudu','Blesbok','Springbok','Blue Wildebeest','Burchell\'s Zebra',
    'Warthog','Waterbuck','Eland','Gemsbok','Bushbuck','Common Duiker',
    'Steenbok','Nyala','Sable Antelope','Roan Antelope','Buffalo','Giraffe',
    'White Rhino','Black Rhino','Lion','Leopard','Cheetah','Crocodile','Hippo',
  ]

  async function addQuick(name) {
    if (species.find(s => s.name === name)) return
    await supabase.from('species').insert({ name })
    loadSpecies()
  }

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h3 style={{ margin:0, fontSize:15, color:'#1B4332' }}>Species List ({species.length})</h3>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Species</button>
      </div>

      {/* Quick-add common species */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-title" style={{ marginBottom:10 }}>Quick-add common South African species</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {COMMON_SPECIES.map(name => {
            const exists = species.find(s => s.name === name)
            return (
              <button key={name} onClick={() => addQuick(name)} disabled={!!exists}
                style={{
                  padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:500,
                  border:'1px solid #E0DBD0', cursor: exists ? 'default' : 'pointer',
                  background: exists ? '#F0EBE0' : '#fff',
                  color: exists ? '#6B7280' : '#1A1A1A',
                  textDecoration: exists ? 'line-through' : 'none',
                }}>
                {exists ? '✓ ' : '+ '}{name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Species table */}
      <div className="table-wrap">
        {loading
          ? <p style={{ padding:20, color:'#6B7280' }}>Loading species…</p>
          : species.length === 0
            ? <div className="empty-state">
                <p>No species added yet</p>
                <button className="btn btn-primary" onClick={openAdd}>Add first species</button>
              </div>
            : <table>
                <thead><tr>
                  <th>Species Name</th><th>Category</th><th>Notes</th><th></th>
                </tr></thead>
                <tbody>
                  {species.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td style={{ fontSize:12, color:'#6B7280', textTransform:'capitalize' }}>{s.category || '—'}</td>
                      <td style={{ fontSize:12, color:'#6B7280' }}>{s.notes || '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} style={{ marginRight:4 }}>Edit</button>
                        <button className="btn btn-sm" onClick={() => handleDelete(s.id, s.name)}
                          style={{ background:'#FDECEA', color:'#C0392B', border:'none' }}>✕</button>
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
              <h3>{editRow ? 'Edit Species' : 'Add Species'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:12 }}>{error}</div>}
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Species Name *</label>
                    <input className="form-input" required value={form.name}
                      onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      placeholder="e.g. Greater Kudu" autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category}
                      onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                      <option value="">— Select —</option>
                      <option value="antelope">Antelope</option>
                      <option value="predator">Predator</option>
                      <option value="plains_game">Plains Game</option>
                      <option value="big_game">Big Game</option>
                      <option value="dangerous_game">Dangerous Game</option>
                      <option value="bird">Bird</option>
                      <option value="reptile">Reptile</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes}
                      onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                      placeholder="Any notes about this species…" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editRow ? 'Save Changes' : 'Add Species'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── CAMPS MANAGER ─── */
function CampsManager() {
  const [camps, setCamps]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const CAMP_TYPES = ['hunting','breeding','quarantine','boma','mixed']
  const [form, setForm] = useState({
    name:'', camp_type:'hunting', area_ha:'', capacity_hunters:'',
    fencing_type:'', water_source:'', gps_coordinates:'', notes:'',
  })

  useEffect(() => { loadCamps() }, [])

  async function loadCamps() {
    setLoading(true)
    const { data } = await supabase.from('camps').select('*').order('name')
    setCamps(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditRow(null)
    setForm({ name:'', camp_type:'hunting', area_ha:'', capacity_hunters:'', fencing_type:'', water_source:'', gps_coordinates:'', notes:'' })
    setError('')
    setShowModal(true)
  }

  function openEdit(c) {
    setEditRow(c)
    setForm({
      name: c.name ?? '', camp_type: c.camp_type ?? 'hunting',
      area_ha: c.area_ha ?? '', capacity_hunters: c.capacity_hunters ?? '',
      fencing_type: c.fencing_type ?? '', water_source: c.water_source ?? '',
      gps_coordinates: c.gps_coordinates ?? '', notes: c.notes ?? '',
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
      area_ha: form.area_ha ? parseFloat(form.area_ha) : null,
      capacity_hunters: form.capacity_hunters ? parseInt(form.capacity_hunters) : null,
    }
    const { error: err } = editRow
      ? await supabase.from('camps').update(payload).eq('id', editRow.id)
      : await supabase.from('camps').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    setShowModal(false)
    loadCamps()
    setSaving(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? Animals assigned to this camp will lose their camp assignment.`)) return
    await supabase.from('camps').delete().eq('id', id)
    loadCamps()
  }

  const typeColor = t => ({
    hunting:'pill-green', breeding:'pill-purple', quarantine:'pill-amber',
    boma:'pill-blue', mixed:'pill-gray',
  }[t] ?? 'pill-gray')

  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h3 style={{ margin:0, fontSize:15, color:'#1B4332' }}>Camps & Zones ({camps.length})</h3>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Camp</button>
      </div>

      <div className="table-wrap">
        {loading
          ? <p style={{ padding:20, color:'#6B7280' }}>Loading camps…</p>
          : camps.length === 0
            ? <div className="empty-state">
                <p>No camps added yet</p>
                <button className="btn btn-primary" onClick={openAdd}>Add first camp</button>
              </div>
            : <table>
                <thead><tr>
                  <th>Camp Name</th><th>Type</th><th>Area (ha)</th>
                  <th>Capacity</th><th>Water Source</th><th></th>
                </tr></thead>
                <tbody>
                  {camps.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td><span className={`pill ${typeColor(c.camp_type)}`} style={{ fontSize:10 }}>{c.camp_type}</span></td>
                      <td>{c.area_ha ? `${c.area_ha} ha` : '—'}</td>
                      <td>{c.capacity_hunters ? `${c.capacity_hunters} hunters` : '—'}</td>
                      <td style={{ fontSize:12 }}>{c.water_source || '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} style={{ marginRight:4 }}>Edit</button>
                        <button className="btn btn-sm" onClick={() => handleDelete(c.id, c.name)}
                          style={{ background:'#FDECEA', color:'#C0392B', border:'none' }}>✕</button>
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
              <h3>{editRow ? `Edit ${editRow.name}` : 'Add New Camp'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:12 }}>{error}</div>}
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Camp Name *</label>
                    <input className="form-input" required value={form.name}
                      onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      placeholder="e.g. 700ha Hunting Block" autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.camp_type}
                      onChange={e => setForm(f => ({...f, camp_type: e.target.value}))}>
                      {CAMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Area (ha)</label>
                    <input className="form-input" type="number" min="0" step="0.1" value={form.area_ha}
                      onChange={e => setForm(f => ({...f, area_ha: e.target.value}))} placeholder="e.g. 700" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hunter Capacity</label>
                    <input className="form-input" type="number" min="0" value={form.capacity_hunters}
                      onChange={e => setForm(f => ({...f, capacity_hunters: e.target.value}))} placeholder="e.g. 6" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fencing Type</label>
                    <input className="form-input" value={form.fencing_type}
                      onChange={e => setForm(f => ({...f, fencing_type: e.target.value}))}
                      placeholder="e.g. Game fence 2.4m" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Water Source</label>
                    <input className="form-input" value={form.water_source}
                      onChange={e => setForm(f => ({...f, water_source: e.target.value}))}
                      placeholder="e.g. Borehole + dam" />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">GPS Coordinates</label>
                    <input className="form-input" value={form.gps_coordinates}
                      onChange={e => setForm(f => ({...f, gps_coordinates: e.target.value}))}
                      placeholder="e.g. -24.123456, 28.987654" />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes}
                      onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                      placeholder="Any notes about this camp…" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editRow ? 'Save Changes' : 'Add Camp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
