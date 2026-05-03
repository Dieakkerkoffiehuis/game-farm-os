import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const RESULTS = ['successful','wounded','missed','cancelled']

const pillClass = r => ({
  successful:'pill-green', wounded:'pill-amber',
  missed:'pill-red', cancelled:'pill-gray',
}[r] ?? 'pill-gray')

// When a hunt is logged, what status should the animal get?
const animalStatusFromResult = r => ({
  successful: 'harvested',
  wounded:    'wounded',
  missed:     'huntable',  // still huntable
  cancelled:  'huntable',
}[r] ?? 'huntable')

export default function HuntLog() {
  const [hunts, setHunts]       = useState([])
  const [bookings, setBookings] = useState([])
  const [species, setSpecies]   = useState([])
  const [camps, setCamps]       = useState([])
  const [users, setUsers]       = useState([])
  const [animals, setAnimals]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm] = useState({
    booking_id:'', hunt_date: new Date().toISOString().split('T')[0],
    hunt_time:'06:00', species_id:'', animal_id:'', camp_id:'',
    ph_id:'', tracker_id:'', result:'successful',
    shot_distance_m:'', num_shots:'1',
    weather:'', carcass_weight_kg:'', notes:'',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [hRes, bRes, sRes, cRes, uRes, aRes] = await Promise.all([
      supabase.from('hunts')
        .select('*, bookings(booking_ref, clients(full_name)), species(name), camps(name)')
        .order('hunt_date', { ascending: false })
        .limit(100),
      supabase.from('bookings')
        .select('id, booking_ref, clients(full_name)')
        .in('status', ['confirmed','active'])
        .order('arrival_date'),
      supabase.from('species').select('id, name').order('name'),
      supabase.from('camps').select('id, name').order('name'),
      supabase.from('users').select('id, full_name').order('full_name'),
      supabase.from('animals')
        .select('id, animal_code, species_id, sex, estimated_age, status, tag_number')
        .in('status', ['huntable','wounded'])
        .order('animal_code'),
    ])
    setHunts(hRes.data ?? [])
    setBookings(bRes.data ?? [])
    setSpecies(sRes.data ?? [])
    setCamps(cRes.data ?? [])
    setUsers(uRes.data ?? [])
    setAnimals(aRes.data ?? [])
    setLoading(false)
  }

  // Filter animals to only show those matching selected species
  const availableAnimals = form.species_id
    ? animals.filter(a => a.species_id === form.species_id)
    : animals

  function openAdd() {
    setForm({
      booking_id:'', hunt_date: new Date().toISOString().split('T')[0],
      hunt_time:'06:00', species_id:'', animal_id:'', camp_id:'',
      ph_id:'', tracker_id:'', result:'successful',
      shot_distance_m:'', num_shots:'1',
      weather:'', carcass_weight_kg:'', notes:'',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      booking_id:        form.booking_id        || null,
      hunt_date:         form.hunt_date,
      hunt_time:         form.hunt_time         || null,
      species_id:        form.species_id        || null,
      camp_id:           form.camp_id           || null,
      ph_id:             form.ph_id             || null,
      tracker_id:        form.tracker_id        || null,
      result:            form.result,
      shot_distance_m:   form.shot_distance_m   ? parseInt(form.shot_distance_m)      : null,
      num_shots:         form.num_shots         ? parseInt(form.num_shots)            : null,
      carcass_weight_kg: form.carcass_weight_kg ? parseFloat(form.carcass_weight_kg) : null,
      weather:           form.weather           || null,
      notes:             form.notes             || null,
    }

    const { error: err } = await supabase.from('hunts').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }

    // Auto-update the linked animal's status
    if (form.animal_id) {
      const newStatus = animalStatusFromResult(form.result)
      await supabase.from('animals').update({ status: newStatus }).eq('id', form.animal_id)
    }

    setShowModal(false)
    loadAll()
    setSaving(false)
  }

  const phUsers      = users  // All users can be PHs
  const trackerUsers = users  // All users can be trackers

  return (
    <div>
      <div className="page-header">
        <div><h1>Hunt Log</h1><p>Daily field records for every hunt</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Log Hunt</button>
      </div>

      {/* Summary pills */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        {RESULTS.map(r => {
          const count = hunts.filter(h => h.result === r).length
          return <div key={r} className={`pill ${pillClass(r)}`} style={{ padding:'4px 12px', fontSize:11 }}>
            {r}: <strong>{count}</strong>
          </div>
        })}
        <span style={{ marginLeft:'auto', fontSize:11, color:'#6B7280', alignSelf:'center' }}>
          {hunts.length} total hunt entries
        </span>
      </div>

      <div className="table-wrap">
        {loading
          ? <p style={{ padding:20, color:'#6B7280' }}>Loading hunt log…</p>
          : hunts.length === 0
            ? <div className="empty-state"><p>No hunts logged yet</p><button className="btn btn-primary" onClick={openAdd}>Log first hunt</button></div>
            : <table>
                <thead><tr>
                  <th>Date</th><th>Client</th><th>Species</th><th>Camp</th>
                  <th>PH</th><th>Tracker</th><th>Distance</th><th>Shots</th><th>Result</th>
                </tr></thead>
                <tbody>
                  {hunts.map(h => (
                    <tr key={h.id}>
                      <td>{h.hunt_date}</td>
                      <td>{h.bookings?.clients?.full_name ?? '—'}</td>
                      <td><strong>{h.species?.name ?? '—'}</strong></td>
                      <td>{h.camps?.name ?? '—'}</td>
                      <td style={{ fontSize:11 }}>{users.find(u => u.id === h.ph_id)?.full_name ?? '—'}</td>
                      <td style={{ fontSize:11 }}>{users.find(u => u.id === h.tracker_id)?.full_name ?? '—'}</td>
                      <td>{h.shot_distance_m ? `${h.shot_distance_m}m` : '—'}</td>
                      <td>{h.num_shots ?? '—'}</td>
                      <td><span className={`pill ${pillClass(h.result)}`}>{h.result}</span></td>
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
              <h3>Log Hunt Entry</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:12 }}>{error}</div>}

                {/* Result — big tap targets */}
                <div style={{ marginBottom:14 }}>
                  <div className="form-label" style={{ marginBottom:8 }}>Result *</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {RESULTS.map(r => (
                      <button type="button" key={r} onClick={() => setForm(f => ({...f, result:r}))}
                        style={{
                          flex:1, padding:'10px 4px', borderRadius:8, fontSize:12, fontWeight:600,
                          border: form.result === r ? '2px solid #1B4332' : '1px solid #E0DBD0',
                          background: form.result === r
                            ? (r==='successful'?'#D5F0E0': r==='wounded'?'#FFF3CD':'#FDECEA')
                            : '#fff',
                          color: form.result === r
                            ? (r==='successful'?'#1A7A3A': r==='wounded'?'#856404':'#C0392B')
                            : '#6B7280',
                          textTransform: 'capitalize',
                        }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input className="form-input" type="date" required value={form.hunt_date}
                      onChange={e => setForm(f => ({...f, hunt_date: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input className="form-input" type="time" value={form.hunt_time}
                      onChange={e => setForm(f => ({...f, hunt_time: e.target.value}))} />
                  </div>

                  {/* Booking link */}
                  <div className="form-group full">
                    <label className="form-label">Linked Booking</label>
                    <select className="form-select" value={form.booking_id}
                      onChange={e => setForm(f => ({...f, booking_id: e.target.value}))}>
                      <option value="">— No booking linked —</option>
                      {bookings.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.booking_ref} — {b.clients?.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Species — selecting this filters the animal picker */}
                  <div className="form-group">
                    <label className="form-label">Species *</label>
                    <select className="form-select" required value={form.species_id}
                      onChange={e => setForm(f => ({...f, species_id: e.target.value, animal_id: ''}))}>
                      <option value="">Select species</option>
                      {species.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {/* Specific animal picker — filters by species */}
                  <div className="form-group">
                    <label className="form-label">
                      Specific Animal
                      {form.species_id && availableAnimals.length === 0 && (
                        <span style={{ color:'#E67E22', fontSize:10, marginLeft:6 }}>No huntable animals of this species</span>
                      )}
                    </label>
                    <select className="form-select" value={form.animal_id}
                      onChange={e => setForm(f => ({...f, animal_id: e.target.value}))}
                      disabled={!form.species_id}>
                      <option value="">— Select animal (optional) —</option>
                      {availableAnimals.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.animal_code}{a.tag_number ? ` [${a.tag_number}]` : ''} — {a.sex}{a.estimated_age ? `, ${a.estimated_age}y` : ''}
                        </option>
                      ))}
                    </select>
                    {form.animal_id && (
                      <div style={{ fontSize:10, color:'#1A7A3A', marginTop:4 }}>
                        ✓ Animal status will be set to <strong>{animalStatusFromResult(form.result)}</strong> on save
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Camp / Zone</label>
                    <select className="form-select" value={form.camp_id}
                      onChange={e => setForm(f => ({...f, camp_id: e.target.value}))}>
                      <option value="">Select camp</option>
                      {camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Professional Hunter</label>
                    <select className="form-select" value={form.ph_id}
                      onChange={e => setForm(f => ({...f, ph_id: e.target.value}))}>
                      <option value="">— Select PH —</option>
                      {phUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tracker</label>
                    <select className="form-select" value={form.tracker_id}
                      onChange={e => setForm(f => ({...f, tracker_id: e.target.value}))}>
                      <option value="">— Select tracker —</option>
                      {trackerUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Shot Distance (m)</label>
                    <input className="form-input" type="number" min="0" value={form.shot_distance_m}
                      onChange={e => setForm(f => ({...f, shot_distance_m: e.target.value}))} placeholder="e.g. 187" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Shots</label>
                    <input className="form-input" type="number" min="1" value={form.num_shots}
                      onChange={e => setForm(f => ({...f, num_shots: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Carcass Weight (kg)</label>
                    <input className="form-input" type="number" min="0" step="0.1" value={form.carcass_weight_kg}
                      onChange={e => setForm(f => ({...f, carcass_weight_kg: e.target.value}))} placeholder="e.g. 62.5" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weather Conditions</label>
                    <input className="form-input" value={form.weather}
                      onChange={e => setForm(f => ({...f, weather: e.target.value}))} placeholder="e.g. Clear, light NE wind" />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes}
                      onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                      placeholder="Hunt notes, tracking details, client comments…" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Hunt Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
