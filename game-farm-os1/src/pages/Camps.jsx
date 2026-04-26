import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CAMP_TYPES = ['hunting','breeding','quarantine','boma','mixed']

const typeColor = t => ({
  hunting:'pill-green', breeding:'pill-purple', quarantine:'pill-amber',
  boma:'pill-blue', mixed:'pill-gray',
}[t] ?? 'pill-gray')

export default function Camps() {
  const [camps, setCamps]     = useState([])
  const [animals, setAnimals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [selected, setSelected] = useState(null) // camp detail view
  const [form, setForm] = useState({
    name:'', camp_type:'hunting', area_ha:'', capacity_hunters:'',
    fencing_type:'', water_source:'', gps_coordinates:'', notes:'',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [cRes, aRes] = await Promise.all([
      supabase.from('camps').select('*').order('name'),
      supabase.from('animals')
        .select('id, camp_id, status, species(name), sex, estimated_value')
        .not('status', 'eq', 'deceased'),
    ])
    setCamps(cRes.data ?? [])
    setAnimals(aRes.data ?? [])
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
      area_ha:           form.area_ha           ? parseFloat(form.area_ha)           : null,
      capacity_hunters:  form.capacity_hunters   ? parseInt(form.capacity_hunters)    : null,
    }
    const { error: err } = editRow
      ? await supabase.from('camps').update(payload).eq('id', editRow.id)
      : await supabase.from('camps').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    setShowModal(false)
    if (selected?.id === editRow?.id) setSelected({ ...selected, ...payload })
    loadAll()
    setSaving(false)
  }

  // Per-camp animal counts
  const campAnimals = campId => animals.filter(a => a.camp_id === campId)
  const campValue   = campId => campAnimals(campId).reduce((s, a) => s + (a.estimated_value ?? 0), 0)

  // Species breakdown for selected camp
  const speciesBreakdown = campId => {
    const map = {}
    campAnimals(campId).forEach(a => {
      const name = a.species?.name ?? 'Unknown'
      if (!map[name]) map[name] = { total:0, male:0, female:0 }
      map[name].total++
      if (a.sex === 'male')   map[name].male++
      if (a.sex === 'female') map[name].female++
    })
    return Object.entries(map).sort((a,b) => b[1].total - a[1].total)
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Camps & Zones</h1><p>Camp management and animal distribution</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Camp</button>
      </div>

      {loading
        ? <p style={{ padding:20, color:'#6B7280' }}>Loading camps…</p>
        : camps.length === 0
          ? <div className="empty-state"><p>No camps configured</p><button className="btn btn-primary" onClick={openAdd}>Add first camp</button></div>
          : (
            <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:16 }}>
              {/* Camp cards grid */}
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12, marginBottom:16 }}>
                  {camps.map(c => {
                    const animalCount = campAnimals(c.id).length
                    const huntable    = campAnimals(c.id).filter(a => a.status === 'huntable').length
                    const value       = campValue(c.id)
                    const isSelected  = selected?.id === c.id
                    return (
                      <div key={c.id}
                        onClick={() => setSelected(isSelected ? null : c)}
                        style={{
                          background:'#fff', border: isSelected ? '2px solid #1B4332' : '1px solid #E0DBD0',
                          borderRadius:12, padding:16, cursor:'pointer',
                          boxShadow: isSelected ? '0 2px 12px rgba(27,67,50,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                          transition:'all 0.15s',
                        }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:15, color:'#1A1A1A' }}>{c.name}</div>
                            {c.area_ha && <div style={{ fontSize:11, color:'#6B7280' }}>{c.area_ha} ha</div>}
                          </div>
                          <span className={`pill ${typeColor(c.camp_type)}`} style={{ fontSize:10 }}>{c.camp_type}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                          <div style={{ background:'#F9F6EF', borderRadius:8, padding:'8px 10px' }}>
                            <div style={{ fontSize:20, fontWeight:700, color:'#1B4332' }}>{animalCount}</div>
                            <div style={{ fontSize:10, color:'#6B7280' }}>Total animals</div>
                          </div>
                          <div style={{ background:'#F9F6EF', borderRadius:8, padding:'8px 10px' }}>
                            <div style={{ fontSize:20, fontWeight:700, color:'#2D6A4F' }}>{huntable}</div>
                            <div style={{ fontSize:10, color:'#6B7280' }}>Huntable</div>
                          </div>
                        </div>
                        {value > 0 && (
                          <div style={{ fontSize:11, color:'#6B7280', marginBottom:8 }}>
                            Est. value: <strong style={{ color:'#1A1A1A' }}>R{Number(value).toLocaleString()}</strong>
                          </div>
                        )}
                        <div style={{ display:'flex', justifyContent:'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={ev => { ev.stopPropagation(); openEdit(c) }}>
                            Edit camp
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Detail panel */}
              {selected && (
                <div className="card" style={{ position:'sticky', top:16, alignSelf:'start' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div>
                      <div className="card-title" style={{ marginBottom:2 }}>{selected.name}</div>
                      <span className={`pill ${typeColor(selected.camp_type)}`} style={{ fontSize:10 }}>{selected.camp_type}</span>
                    </div>
                    <button className="modal-close" onClick={() => setSelected(null)}>×</button>
                  </div>

                  {/* Camp info */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                    {[
                      ['Area', selected.area_ha ? `${selected.area_ha} ha` : '—'],
                      ['Capacity', selected.capacity_hunters ? `${selected.capacity_hunters} hunters` : '—'],
                      ['Fencing', selected.fencing_type || '—'],
                      ['Water', selected.water_source || '—'],
                    ].map(([label, val]) => (
                      <div key={label} style={{ background:'#F9F6EF', borderRadius:8, padding:'8px 10px' }}>
                        <div style={{ fontSize:10, color:'#6B7280' }}>{label}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#1A1A1A' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {selected.gps_coordinates && (
                    <div style={{ marginBottom:12, fontSize:11, color:'#6B7280' }}>
                      📍 {selected.gps_coordinates}
                    </div>
                  )}

                  {/* Species breakdown */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontWeight:600, fontSize:12, marginBottom:8, color:'#1B4332' }}>
                      Species in Camp ({campAnimals(selected.id).length} animals)
                    </div>
                    {speciesBreakdown(selected.id).length === 0
                      ? <p style={{ fontSize:12, color:'#6B7280' }}>No animals recorded in this camp</p>
                      : speciesBreakdown(selected.id).map(([name, counts]) => (
                          <div key={name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                            padding:'6px 0', borderBottom:'0.5px solid #F0EBE0', fontSize:12 }}>
                            <strong>{name}</strong>
                            <div style={{ display:'flex', gap:10, fontSize:11, color:'#6B7280' }}>
                              <span>♂ {counts.male}</span>
                              <span>♀ {counts.female}</span>
                              <span style={{ fontWeight:700, color:'#1A1A1A' }}>{counts.total}</span>
                            </div>
                          </div>
                        ))
                    }
                  </div>

                  {/* Status breakdown */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                    {['huntable','breeding','quarantine','relocated','sold'].map(status => {
                      const count = campAnimals(selected.id).filter(a => a.status === status).length
                      if (!count) return null
                      return (
                        <div key={status} style={{ fontSize:10, padding:'3px 8px', borderRadius:99,
                          background:'#F0EBE0', color:'#1A1A1A' }}>
                          {status}: <strong>{count}</strong>
                        </div>
                      )
                    })}
                  </div>

                  {selected.notes && (
                    <div style={{ marginTop:12, padding:'10px 12px', background:'#F9F6EF', borderRadius:8, fontSize:12, color:'#4B4B4B' }}>
                      {selected.notes}
                    </div>
                  )}

                  <div style={{ marginTop:14, display:'flex', gap:8 }}>
                    <button className="btn btn-primary" style={{ flex:1 }} onClick={() => openEdit(selected)}>
                      Edit Camp
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
      }

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
                      placeholder="e.g. Kudu Bush Camp" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Camp Type</label>
                    <select className="form-select" value={form.camp_type}
                      onChange={e => setForm(f => ({...f, camp_type: e.target.value}))}>
                      {CAMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Area (ha)</label>
                    <input className="form-input" type="number" min="0" step="0.1" value={form.area_ha}
                      onChange={e => setForm(f => ({...f, area_ha: e.target.value}))} placeholder="e.g. 250" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hunter Capacity</label>
                    <input className="form-input" type="number" min="0" value={form.capacity_hunters}
                      onChange={e => setForm(f => ({...f, capacity_hunters: e.target.value}))} placeholder="e.g. 4" />
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
    </div>
  )
}
