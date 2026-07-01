// UC007 — Admin user management: admins, crew, public users.
import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

const TABS = ['admins', 'crew', 'users']

// ── Small toast ───────────────────────────────────────────────────────────────
function Toast({ msg, ok }) {
  if (!msg) return null
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lift text-sm font-semibold text-white transition-all
      ${ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {msg}
    </div>
  )
}

// ── Confirmation dialog ───────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel, busy, confirmLabel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <p className="text-slate-800 text-sm font-medium leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : (confirmLabel || 'Delete')}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ── Add-account modal ─────────────────────────────────────────────────────────
function AddModal({ type, teams, onClose, onCreated, t }) {
  const isAdmin = type === 'admin'
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    first_name: '', last_name: '', phone_number: '', team_id: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const endpoint = isAdmin ? '/admin/admins' : '/admin/crew'
      const payload = isAdmin
        ? { username: form.username, email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name }
        : { username: form.username, email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name, phone_number: form.phone_number, team_id: form.team_id }
      const { data } = await api.post(endpoint, payload)
      onCreated(data.data)
    } catch (e) {
      setErr(e.response?.data?.message ?? t('users.createFailed'))
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-extrabold text-slate-900">
            {isAdmin ? t('users.addAdminTitle') : t('users.addCrewTitle')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('users.fieldFirstName')}</label>
              <input className={inputCls} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('users.fieldLastName')}</label>
              <input className={inputCls} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('users.fieldUsername')} *</label>
            <input className={inputCls} value={form.username} onChange={(e) => set('username', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>{t('users.fieldEmail')} *</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>{t('users.fieldPassword')} *</label>
            <input type="password" className={inputCls} value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
          </div>
          {!isAdmin && (
            <>
              <div>
                <label className={labelCls}>{t('users.fieldPhone')}</label>
                <input className={inputCls} value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t('users.fieldTeam')} *</label>
                <select className={inputCls} value={form.team_id} onChange={(e) => set('team_id', e.target.value)} required>
                  <option value="">{t('users.selectTeam')}</option>
                  {teams.map((team) => (
                    <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {err && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? t('users.creating') : (isAdmin ? t('users.createAdmin') : t('users.createCrew'))}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ active, t }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold
      ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
      {active ? t('users.active') : t('users.inactive')}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { t } = useI18n()
  const { user: me } = useAuth()
  const [tab, setTab] = useState('admins')
  const [admins, setAdmins] = useState([])
  const [crew, setCrew] = useState([])
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)
  const [modal, setModal] = useState(null) // 'admin' | 'crew' | null
  const [confirm, setConfirm] = useState(null) // { type, id, name }
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function showToast(msg, ok = true) {
    clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadErr(false)
    try {
      const [adminsRes, crewRes, usersRes, teamsRes] = await Promise.all([
        api.get('/admin/admins'),
        api.get('/admin/crew'),
        api.get('/users/admin/users'),
        api.get('/admin/teams'),
      ])
      setAdmins(adminsRes.data.data ?? [])
      setCrew(crewRes.data.data ?? [])
      setUsers(usersRes.data.data ?? [])
      setTeams(teamsRes.data.data ?? [])
    } catch {
      setLoadErr(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      if (confirm.type === 'admin') {
        await api.delete(`/admin/admins/${confirm.id}`)
        setAdmins((a) => a.filter((x) => x.admin_id !== confirm.id))
      } else {
        await api.delete(`/admin/users/${confirm.id}`)
        if (confirm.role === 'crew') setCrew((c) => c.filter((x) => x.user_id !== confirm.id))
        else setUsers((u) => u.filter((x) => x.user_id !== confirm.id))
      }
      showToast(t('users.deleted'))
    } catch (e) {
      showToast(e.response?.data?.message ?? t('users.deleteFailed'), false)
    } finally {
      setConfirmBusy(false)
      setConfirm(null)
    }
  }

  function onCreated(account) {
    if (modal === 'admin') setAdmins((a) => [account, ...a])
    else setCrew((c) => [account, ...c])
    setModal(null)
    showToast(t('users.createSuccess'))
  }

  const tabClass = (key) =>
    `px-4 py-2 text-sm font-bold rounded-xl transition-colors cursor-pointer ${
      tab === key
        ? 'bg-orange-500 text-white shadow-[0_4px_10px_-2px_rgba(249,115,22,0.45)]'
        : 'text-slate-500 hover:bg-slate-100'
    }`

  const thCls = 'text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-4 py-3'
  const tdCls = 'px-4 py-3 text-sm text-slate-700 align-middle'

  function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString()
  }

  function fullName(row) {
    const n = [row.first_name, row.last_name].filter(Boolean).join(' ')
    return n || t('users.unnamedUser')
  }

  function teamName(teamId) {
    const t_ = teams.find((t) => t.team_id === teamId)
    return t_ ? t_.team_name : `#${teamId}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('users.pageTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">{t('users.pageLead')}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {tab === 'admins' && (
            <Button size="sm" onClick={() => setModal('admin')}>{t('users.addAdmin')}</Button>
          )}
          {tab === 'crew' && (
            <Button size="sm" onClick={() => setModal('crew')}>{t('users.addCrew')}</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((key) => (
          <button key={key} className={tabClass(key)} onClick={() => setTab(key)}>
            {t(`users.tab${key.charAt(0).toUpperCase() + key.slice(1)}`)}
            <span className="ml-1.5 text-[11px] opacity-75">
              ({key === 'admins' ? admins.length : key === 'crew' ? crew.length : users.length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loadErr ? (
        <div className="text-center py-16 text-red-500 text-sm">
          <p>{t('users.loadFailed')}</p>
          <button onClick={load} className="mt-3 text-orange-500 hover:underline cursor-pointer">{t('common.retry')}</button>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">

            {/* ── Admins tab ── */}
            {tab === 'admins' && (
              admins.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">{t('users.noAdmins')}</p>
              ) : (
                <table className="w-full">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className={thCls}>{t('users.colName')}</th>
                      <th className={thCls}>{t('users.colUsername')}</th>
                      <th className={thCls}>{t('users.colEmail')}</th>
                      <th className={thCls}>{t('users.colStatus')}</th>
                      <th className={thCls}>{t('users.colJoined')}</th>
                      <th className={thCls}>{t('users.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {admins.map((a) => {
                      const isSelf = a.admin_id === me?.admin_id
                      return (
                        <tr key={a.admin_id} className="hover:bg-slate-50 transition-colors">
                          <td className={tdCls}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-blue-600 grid place-items-center text-xs font-bold text-white shrink-0">
                                {(a.username ?? 'A').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-900">{fullName(a)}</span>
                              {isSelf && <span className="text-[11px] text-slate-400 font-medium">{t('users.you')}</span>}
                            </div>
                          </td>
                          <td className={tdCls + ' font-mono text-xs text-slate-500'}>{a.username}</td>
                          <td className={tdCls}>{a.email}</td>
                          <td className={tdCls}><StatusBadge active={a.is_active} t={t} /></td>
                          <td className={tdCls + ' text-slate-400 text-xs'}>{fmtDate(a.created_date)}</td>
                          <td className={tdCls}>
                            {!isSelf && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setConfirm({ type: 'admin', id: a.admin_id, name: a.username })}
                              >
                                Delete
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            )}

            {/* ── Crew tab ── */}
            {tab === 'crew' && (
              crew.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">{t('users.noCrew')}</p>
              ) : (
                <table className="w-full">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className={thCls}>{t('users.colName')}</th>
                      <th className={thCls}>{t('users.colUsername')}</th>
                      <th className={thCls}>{t('users.colEmail')}</th>
                      <th className={thCls}>{t('users.colTeam')}</th>
                      <th className={thCls}>{t('users.colStatus')}</th>
                      <th className={thCls}>{t('users.colJoined')}</th>
                      <th className={thCls}>{t('users.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {crew.map((c) => (
                      <tr key={c.user_id} className="hover:bg-slate-50 transition-colors">
                        <td className={tdCls}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 grid place-items-center text-xs font-bold text-white shrink-0">
                              {(c.username ?? 'C').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900">{fullName(c)}</span>
                          </div>
                        </td>
                        <td className={tdCls + ' font-mono text-xs text-slate-500'}>{c.username}</td>
                        <td className={tdCls}>{c.email}</td>
                        <td className={tdCls}>
                          {c.team_id
                            ? <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">{teamName(c.team_id)}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className={tdCls}><StatusBadge active={c.is_active} t={t} /></td>
                        <td className={tdCls + ' text-slate-400 text-xs'}>{fmtDate(c.created_date)}</td>
                        <td className={tdCls}>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirm({ type: 'user', role: 'crew', id: c.user_id, name: c.username })}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* ── Users tab ── */}
            {tab === 'users' && (
              users.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">{t('users.noUsers')}</p>
              ) : (
                <table className="w-full">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className={thCls}>{t('users.colName')}</th>
                      <th className={thCls}>{t('users.colUsername')}</th>
                      <th className={thCls}>{t('users.colEmail')}</th>
                      <th className={thCls}>{t('users.colStatus')}</th>
                      <th className={thCls}>{t('users.colJoined')}</th>
                      <th className={thCls}>{t('users.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.filter((u) => u.role !== 'crew').map((u) => (
                      <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                        <td className={tdCls}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 grid place-items-center text-xs font-bold text-white shrink-0">
                              {(u.username ?? 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900">{fullName(u)}</span>
                          </div>
                        </td>
                        <td className={tdCls + ' font-mono text-xs text-slate-500'}>{u.username}</td>
                        <td className={tdCls}>{u.email}</td>
                        <td className={tdCls}><StatusBadge active={u.is_active} t={t} /></td>
                        <td className={tdCls + ' text-slate-400 text-xs'}>{fmtDate(u.created_date)}</td>
                        <td className={tdCls}>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirm({ type: 'user', role: 'user', id: u.user_id, name: u.username })}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

          </div>
        </Card>
      )}

      {modal && (
        <AddModal
          type={modal}
          teams={teams}
          onClose={() => setModal(null)}
          onCreated={onCreated}
          t={t}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={t('users.deleteConfirm')}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
          busy={confirmBusy}
        />
      )}

      <Toast msg={toast?.msg} ok={toast?.ok} />
    </div>
  )
}
