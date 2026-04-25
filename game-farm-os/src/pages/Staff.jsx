import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TASK_STATUS = ['pending','in_progress','completed','cancelled']
const TASK_PRIORITY = ['low','medium','high','urgent']
const ROLE_OPTS = ['admin','manager','ph','tracker','camp_staff','finance']

const taskPillClass = s => ({
  pending:'pill-amber', in_progress:'pill-blue', completed:'pill-green', cancelled:'pill-gray',
}[s] ?? 'pill-gray')

const priorityColor = p => ({
  low:'#6B7280', medium:'#2D6A4F', high:'#E67E22', urgent:'#C0392B',
}[p] ?? '#6B7280')

export default function Staff() {
  const [users, setUsers]     = useState([])
  const [tasks, setTasks]     = useState([])
  const [roles, setRoles]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('tasks') // 'tasks' | 'team'

  // Task modal state
  const [showTaskModal, setShowTaskModal]   = useState(false)
  const [editTask, setEditTask]             = useState(null)
  const [savingTask, setSavingTask]         = useState(false)
  const [taskError, setTaskError]           = useState('')
  const [taskFilter, setTaskFilter]         = useState({ status:'', assigned_to:'', priority:'' })
  const [taskForm, setTaskForm] = useState({
    title:'', description:'', assigned_to:'', due_date:'',
    status:'pending', priority:'medium', category:'',
  })

  // Staff modal state
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editStaff, setEditStaff]           = useState(null)
  const [savingStaff, setSavingStaff]       = useState(false)
  const [staffError, setStaffError]         = useState('')
  const [staffForm, setStaffForm] = useState({
    full_name:'', email:'', phone:'', role_id:'', id_number:'',
    employment_type:'fulltime', start_date:'', notes:'',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [uRes, tRes, rRes] = await Promise.all([
      supabase.from('users').select('*, roles(name)').order('full_name'),
      supabase.from('tasks')
        .select('*, users!tasks_assigned_to_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('roles').select('id, name').order('name'),
    ])
    setUsers(uRes.data ?? [])
    setTasks(tRes.data ?? [])
    setRoles(rRes.data ?? [])
    setLoading(false)
  }

  const filteredTasks = tasks.filter(t => {
    if (taskFilter.status      && t.status      !== taskFilter.status)      return false
    if (taskFilter.assigned_to && t.assigned_to !== taskFilter.assigned_to) return false
    if (taskFilter.priority    && t.priority    !== taskFilter.priority)     return false
    return true
  })

  // Task handlers
  function openAddTask() {
    setEditTask(null)
    setTaskForm({ title:'', description:'', assigned_to:'', due_date:'', status:'pending', priority:'medium', category:'' })
    setTaskError('')
    setShowTaskModal(true)
  }

  function openEditTask(t) {
    setEditTask(t)
    setTaskForm({
      title: t.title ?? '', description: t.description ?? '',
      assigned_to: t.assigned_to ?? '', due_date: t.due_date ?? '',
      status: t.status ?? 'pending', priority: t.priority ?? 'medium',
      category: t.category ?? '',
    })
    setTaskError('')
    setShowTaskModal(true)
  }

  async function handleSaveTask(e) {
    e.preventDefault()
    setSavingTask(true)
    setTaskError('')
    const payload = { ...taskForm, assigned_to: taskForm.assigned_to || null, due_date: taskForm.due_date || null }
    const { error: err } = editTask
      ? await supabase.from('tasks').update(payload).eq('id', editTask.id)
      : await supabase.from('tasks').insert(payload)
    if (err) { setTaskError(err.message); setSavingTask(false); return }
    setShowTaskModal(false)
    loadAll()
    setSavingTask(false)
  }

  async function quickStatusUpdate(taskId, newStatus) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    loadAll()
  }

  // Staff handlers
  function openAddStaff() {
    setEditStaff(null)
    setStaffForm({ full_name:'', email:'', phone:'', role_id:'', id_number:'', employment_type:'fulltime', start_date:'', notes:'' })
    setStaffError('')
    setShowStaffModal(true)
  }

  function openEditStaff(u) {
    setEditStaff(u)
    setStaffForm({
      full_name: u.full_name ?? '', email: u.email ?? '', phone: u.phone ?? '',
      role_id: u.role_id ?? '', id_number: u.id_number ?? '',
      employment_type: u.employment_type ?? 'fulltime',
      start_date: u.start_date ?? '', notes: u.notes ?? '',
    })
    setStaffError('')
    setShowStaffModal(true)
  }

  async function handleSaveStaff(e) {
    e.preventDefault()
    setSavingStaff(true)
    setStaffError('')
    const payload = { ...staffForm, role_id: staffForm.role_id || null }
    const { error: err } = editStaff
      ? await supabase.from('users').update(payload).eq('id', editStaff.id)
      : await supabase.from('users').insert(payload)
    if (err) { setStaffError(err.message); setSavingStaff(false); return }
    setShowStaffModal(false)
    loadAll()
    setSavingStaff(false)
  }

  const pendingCount    = tasks.filter(t => t.status === 'pending').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length

  return (
    <div>
      <div className="page-header">
        <div><h1>Staff & Tasks</h1><p>Team management and daily task board</p></div>
        <div style={{ display:'flex', gap:8 }}>
          {tab === 'tasks'
            ? <button className="btn btn-primary" onClick={openAddTask}>+ New Task</button>
            : <button className="btn btn-primary" onClick={openAddStaff}>+ Add Staff</button>
          }
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid #E0DBD0', paddingBottom:0 }}>
        {[['tasks','Task Board'], ['team','Team']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding:'8px 18px', background:'none', border:'none', borderRadius:'6px 6px 0 0',
              borderBottom: tab===key ? '2px solid #1B4332' : '2px solid transparent',
              fontWeight: tab===key ? 700 : 400, color: tab===key ? '#1B4332' : '#6B7280',
              cursor:'pointer', fontSize:13,
            }}>
            {label}
            {key==='tasks' && pendingCount > 0 && (
              <span style={{ marginLeft:6, background:'#E67E22', color:'#fff', borderRadius:99, fontSize:10, padding:'1px 6px' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TASK BOARD TAB ── */}
      {tab === 'tasks' && (
        <>
          {/* Summary pills */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            {TASK_STATUS.map(s => {
              const count = tasks.filter(t => t.status === s).length
              return (
                <div key={s} onClick={() => setTaskFilter(f => ({...f, status: f.status===s ? '' : s}))}
                  style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer',
                    border:`1px solid ${taskFilter.status===s ? '#1B4332' : '#E0DBD0'}`,
                    background: taskFilter.status===s ? '#1B4332' : '#fff',
                    color: taskFilter.status===s ? '#C9A96E' : '#1A1A1A' }}>
                  {s.replace(/_/g,' ')} <strong>{count}</strong>
                </div>
              )
            })}
            <select className="form-select" value={taskFilter.assigned_to} style={{ maxWidth:160, marginLeft:'auto' }}
              onChange={e => setTaskFilter(f => ({...f, assigned_to: e.target.value}))}>
              <option value="">All Staff</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <select className="form-select" value={taskFilter.priority} style={{ maxWidth:130 }}
              onChange={e => setTaskFilter(f => ({...f, priority: e.target.value}))}>
              <option value="">All Priority</option>
              {TASK_PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="table-wrap">
            {loading
              ? <p style={{ padding:20, color:'#6B7280' }}>Loading tasks…</p>
              : filteredTasks.length === 0
                ? <div className="empty-state"><p>No tasks found</p><button className="btn btn-primary" onClick={openAddTask}>Create first task</button></div>
                : <table>
                    <thead><tr>
                      <th>Task</th><th>Assigned To</th><th>Priority</th>
                      <th>Due</th><th>Status</th><th></th>
                    </tr></thead>
                    <tbody>
                      {filteredTasks.map(t => (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.title}</strong>
                            {t.description && <span style={{ display:'block', fontSize:11, color:'#6B7280' }}>{t.description.substring(0,60)}{t.description.length > 60 ? '…' : ''}</span>}
                          </td>
                          <td style={{ fontSize:12 }}>{t.users?.full_name ?? <span style={{ color:'#E67E22' }}>Unassigned</span>}</td>
                          <td>
                            <span style={{ fontWeight:600, fontSize:11, color: priorityColor(t.priority), textTransform:'capitalize' }}>
                              {t.priority}
                            </span>
                          </td>
                          <td style={{ fontSize:12 }}>
                            {t.due_date
                              ? <span style={{ color: new Date(t.due_date) < new Date() && t.status !== 'completed' ? '#C0392B' : 'inherit' }}>
                                  {t.due_date}
                                </span>
                              : '—'}
                          </td>
                          <td>
                            <select value={t.status}
                              onChange={e => quickStatusUpdate(t.id, e.target.value)}
                              className={`pill ${taskPillClass(t.status)}`}
                              style={{ border:'none', cursor:'pointer', fontWeight:500, fontSize:11, background:'transparent' }}>
                              {TASK_STATUS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                            </select>
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditTask(t)}>Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            }
          </div>
        </>
      )}

      {/* ── TEAM TAB ── */}
      {tab === 'team' && (
        <div className="table-wrap">
          {loading
            ? <p style={{ padding:20, color:'#6B7280' }}>Loading staff…</p>
            : users.length === 0
              ? <div className="empty-state"><p>No staff found</p><button className="btn btn-primary" onClick={openAddStaff}>Add first staff member</button></div>
              : <table>
                  <thead><tr>
                    <th>Name</th><th>Role</th><th>Email</th><th>Phone</th>
                    <th>Tasks (open)</th><th></th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => {
                      const openTaskCount = tasks.filter(t => t.assigned_to === u.id && ['pending','in_progress'].includes(t.status)).length
                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:30, height:30, borderRadius:'50%', background:'#1B4332', color:'#C9A96E',
                                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                                {u.full_name?.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                              </div>
                              <strong>{u.full_name}</strong>
                            </div>
                          </td>
                          <td><span className="pill pill-blue" style={{ fontSize:10 }}>{u.roles?.name ?? '—'}</span></td>
                          <td style={{ fontSize:12 }}>{u.email ?? '—'}</td>
                          <td style={{ fontSize:12 }}>{u.phone ?? '—'}</td>
                          <td>
                            {openTaskCount > 0
                              ? <span style={{ fontWeight:600, color:'#E67E22' }}>{openTaskCount} open</span>
                              : <span style={{ color:'#1A7A3A' }}>✓ Clear</span>}
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditStaff(u)}>Edit</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
          }
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTaskModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editTask ? 'Edit Task' : 'New Task'}</h3>
              <button className="modal-close" onClick={() => setShowTaskModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="modal-body">
                {taskError && <div className="login-error" style={{ marginBottom:12 }}>{taskError}</div>}
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Task Title *</label>
                    <input className="form-input" required value={taskForm.title}
                      onChange={e => setTaskForm(f => ({...f, title: e.target.value}))}
                      placeholder="e.g. Check water levels in Camp 3" />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" value={taskForm.description}
                      onChange={e => setTaskForm(f => ({...f, description: e.target.value}))}
                      placeholder="Task details…" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign To</label>
                    <select className="form-select" value={taskForm.assigned_to}
                      onChange={e => setTaskForm(f => ({...f, assigned_to: e.target.value}))}>
                      <option value="">— Unassigned —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={taskForm.due_date}
                      onChange={e => setTaskForm(f => ({...f, due_date: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={taskForm.priority}
                      onChange={e => setTaskForm(f => ({...f, priority: e.target.value}))}>
                      {TASK_PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={taskForm.status}
                      onChange={e => setTaskForm(f => ({...f, status: e.target.value}))}>
                      {TASK_STATUS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input className="form-input" value={taskForm.category}
                      onChange={e => setTaskForm(f => ({...f, category: e.target.value}))}
                      placeholder="e.g. Maintenance, Admin" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingTask}>
                  {savingTask ? 'Saving…' : editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowStaffModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button className="modal-close" onClick={() => setShowStaffModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveStaff}>
              <div className="modal-body">
                {staffError && <div className="login-error" style={{ marginBottom:12 }}>{staffError}</div>}
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" required value={staffForm.full_name}
                      onChange={e => setStaffForm(f => ({...f, full_name: e.target.value}))}
                      placeholder="e.g. Pieter van der Merwe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={staffForm.email}
                      onChange={e => setStaffForm(f => ({...f, email: e.target.value}))}
                      placeholder="pieter@farm.co.za" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={staffForm.phone}
                      onChange={e => setStaffForm(f => ({...f, phone: e.target.value}))}
                      placeholder="+27 82 000 0000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={staffForm.role_id}
                      onChange={e => setStaffForm(f => ({...f, role_id: e.target.value}))}>
                      <option value="">Select role</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ID Number</label>
                    <input className="form-input" value={staffForm.id_number}
                      onChange={e => setStaffForm(f => ({...f, id_number: e.target.value}))}
                      placeholder="SA ID number" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employment Type</label>
                    <select className="form-select" value={staffForm.employment_type}
                      onChange={e => setStaffForm(f => ({...f, employment_type: e.target.value}))}>
                      <option value="fulltime">Full-time</option>
                      <option value="parttime">Part-time</option>
                      <option value="seasonal">Seasonal</option>
                      <option value="contractor">Contractor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date" value={staffForm.start_date}
                      onChange={e => setStaffForm(f => ({...f, start_date: e.target.value}))} />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={staffForm.notes}
                      onChange={e => setStaffForm(f => ({...f, notes: e.target.value}))} placeholder="Internal notes…" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowStaffModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingStaff}>
                  {savingStaff ? 'Saving…' : editStaff ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
