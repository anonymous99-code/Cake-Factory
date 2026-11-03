import { useMemo, useState } from 'react'
import { CalendarPlus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/AdminLayout'
import { useFeedback } from '../../components/feedback'
import { Badge, EmptyState, ErrorBox, Field, Input, Modal, PageLoader, Select } from '../../components/ui'
import { adminApi, errorMessage, fieldErrors } from '../../lib/api'
import { formatDate, formatTime, toDateInput } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

const STATUS = {
  UPCOMING: ['Upcoming', 'bg-sky-100 text-sky-800'],
  PREPARING: ['Preparing', 'bg-violet-100 text-violet-800'],
  READY: ['Ready', 'bg-emerald-100 text-emerald-800'],
  SOLD_OUT: ['Sold out', 'bg-red-100 text-red-700'],
  UNAVAILABLE: ['Unavailable', 'bg-cocoa-100 text-cocoa-600'],
}

export default function Availability() {
  const today = toDateInput()
  const { data, loading, error, reload, reloadLoud } = useFetch(() => adminApi.get('/availability/manage/', { params: { from: today } }).then((r) => r.data), [])
  const products = useFetch(() => adminApi.get('/products/').then((r) => r.data.filter((p) => p.is_active)), [])
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState(null)

  const grouped = useMemo(() => {
    const map = new Map()
    ;(data || []).forEach((r) => map.set(r.date, [...(map.get(r.date) || []), r]))
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [data])

  const remove = async (row) => {
    const ok = await confirm({ title: 'Delete this schedule?', message: `${row.product_name} on ${formatDate(row.date)} will be removed.`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try { await adminApi.delete(`/availability/manage/${row.id}/`); toast('Schedule deleted'); reload() } catch (e) { toast(errorMessage(e), 'error') }
  }

  return (
    <>
      <PageHeader title="Availability" subtitle="Schedule what you can prepare on future days. Customers can only book advance orders for scheduled items." actions={<button className="btn btn-primary" onClick={() => setEditing({ date: today })}><CalendarPlus className="h-4 w-4" /> Schedule a product</button>} />
      <div className="mb-6 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-100">
        Today&apos;s stock is set on the <strong>Products</strong> page. This page controls <strong>future dates</strong>. Each order takes its quantity from the day it is booked for, so you can never be overbooked.
      </div>
      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reloadLoud} /> : !grouped.length ? (
        <EmptyState icon={CalendarPlus} title="Nothing scheduled yet" action={<button className="btn btn-primary" onClick={() => setEditing({ date: today })}>Schedule a product</button>}>Schedule a product and quantity for a date, and customers can book it in advance.</EmptyState>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, rows]) => (
            <section key={date}>
              <h2 className="mb-2 text-lg font-semibold">{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
              <div className="card divide-y divide-cocoa-100 !p-0">
                {rows.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="font-semibold">{r.product_name}</p>
                      <p className="text-xs text-cocoa-500">{r.expected_ready_time ? `Ready about ${formatTime(r.expected_ready_time)}` : 'No ready time set'}{r.notes && ` · ${r.notes}`}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm"><strong className="font-display text-lg">{r.available_quantity}</strong> left</span>
                      <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                      <button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => remove(r)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {editing && <ScheduleModal row={editing} products={products.data || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}

function ScheduleModal({ row, products, onClose, onSaved }) {
  const { toast } = useFeedback()
  const isNew = !row.id
  const [form, setForm] = useState({ product: row.product || '', date: row.date || toDateInput(), expected_ready_time: row.expected_ready_time || '', available_quantity: row.available_quantity ?? 10, status: row.status || 'UPCOMING', notes: row.notes || '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.product) { setErrors({ product: 'Choose a product.' }); return }
    setBusy(true)
    setErrors({})
    const body = { ...form, expected_ready_time: form.expected_ready_time || null, available_quantity: Number(form.available_quantity) || 0 }
    try {
      if (isNew) await adminApi.post('/availability/manage/', body)
      else await adminApi.patch(`/availability/manage/${row.id}/`, body)
      toast('Schedule saved')
      onSaved()
    } catch (e) {
      const fe = fieldErrors(e)
      setErrors(fe)
      toast(fe.non_field_errors || errorMessage(e), 'error')
    } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Schedule a product' : 'Edit schedule'}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button></>}>
      <div className="space-y-4">
        <Field label="Product" required error={errors.product}>
          <Select value={form.product} onChange={set('product')} disabled={!isNew} error={errors.product}>
            <option value="">Choose a product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required error={errors.date}><Input type="date" min={toDateInput()} value={form.date} onChange={set('date')} disabled={!isNew} error={errors.date} /></Field>
          <Field label="Expected ready time"><Input type="time" value={form.expected_ready_time} onChange={set('expected_ready_time')} /></Field>
          <Field label="Quantity you can prepare" error={errors.available_quantity}><Input type="number" min="0" value={form.available_quantity} onChange={set('available_quantity')} /></Field>
          <Field label="Status"><Select value={form.status} onChange={set('status')}>{Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        </div>
        <Field label="Notes (optional)"><Input value={form.notes} onChange={set('notes')} maxLength={255} /></Field>
        {errors.non_field_errors && <p className="text-sm font-medium text-red-600">{errors.non_field_errors}</p>}
      </div>
    </Modal>
  )
}
