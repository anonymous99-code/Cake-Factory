import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Loader2, MessageCircle, Phone, RefreshCw, Search, Store, Truck } from 'lucide-react'
import { PageHeader } from '../../components/AdminLayout'
import { useFeedback } from '../../components/feedback'
import { Drawer, EmptyState, ErrorBox, Field, Input, Modal, PageLoader, Select, StatusBadge } from '../../components/ui'
import { adminApi, errorMessage, fieldErrors } from '../../lib/api'
import { formatDate, formatDateTime, formatTime, naira, ORDER_STATUS, PAYMENT_STATUS, whatsappLink } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

const FILTERS = [['', 'All'], ['PENDING', 'Pending'], ['CONFIRMED', 'Confirmed'], ['PREPARING', 'Preparing'], ['READY', 'Ready'], ['OUT_FOR_DELIVERY', 'Out for delivery'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']]

const ACTION_LABEL = {
  CONFIRMED: 'Confirm order', PREPARING: 'Start preparing', READY: 'Mark ready', OUT_FOR_DELIVERY: 'Out for delivery',
  COMPLETED: 'Mark completed', CANCELLED: 'Cancel order',
}

export default function Orders() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [date, setDate] = useState('')
  const [payment, setPayment] = useState('')
  const { data, loading, error, reload, reloadLoud } = useFetch(
    () => adminApi.get('/orders/all/', { params: { status, q, date, payment_status: payment } }).then((r) => r.data),
    [status, q, date, payment],
  )
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  useEffect(() => {
    const timer = setInterval(() => reloadRef.current(), 30000)
    return () => clearInterval(timer)
  }, [])
  const [selectedId, setSelectedId] = useState(null)
  const selected = useMemo(() => data?.find((o) => o.id === selectedId) || null, [data, selectedId])

  return (
    <>
      <PageHeader title="Orders" subtitle="Confirm, prepare and complete customer orders." actions={<button className="btn btn-secondary" onClick={reload}><RefreshCw className="h-4 w-4" /> Refresh</button>} />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button key={value} onClick={() => setStatus(value)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${status === value ? 'bg-cocoa-900 text-white' : 'bg-white text-cocoa-700 ring-1 ring-cocoa-200 hover:bg-cocoa-50'}`}>{label}</button>
        ))}
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" />
          <Input className="pl-10" placeholder="Search name, phone or order ref" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Pickup or delivery date" />
        <Select value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Payment status">
          <option value="">Any payment status</option>
          {Object.entries(PAYMENT_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </Select>
      </div>

      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reloadLoud} /> : !data.length ? (
        <EmptyState title="No orders found">Orders placed on the website show up here. Try clearing the filters.</EmptyState>
      ) : (
        <div className="space-y-3">
          {data.map((o) => (
            <button key={o.id} onClick={() => setSelectedId(o.id)} className="card flex w-full flex-wrap items-center justify-between gap-4 text-left transition hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-berry-400">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-semibold">{o.customer_name}</p>
                  {o.is_advance_order && <span className="badge bg-sky-100 text-sky-800"><CalendarClock className="h-3 w-3" /> Advance</span>}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-cocoa-500">
                  <span className="font-mono">#{o.order_number.slice(0, 8).toUpperCase()}</span>
                  <span>{formatDateTime(o.created_at)}</span>
                  <span className="flex items-center gap-1">{o.fulfillment_method === 'DELIVERY' ? <Truck className="h-3 w-3" /> : <Store className="h-3 w-3" />}{formatDate(o.fulfillment_date)} {formatTime(o.fulfillment_time)}</span>
                </p>
                <p className="mt-1 truncate text-sm text-cocoa-600">{o.items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge map={ORDER_STATUS} value={o.status} />
                <StatusBadge map={PAYMENT_STATUS} value={o.payment_status} />
                <span className="w-24 text-right font-display text-lg font-semibold">{naira(o.total_amount)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <OrderDrawer order={selected} onClose={() => setSelectedId(null)} onChanged={reload} />
    </>
  )
}

function OrderDrawer({ order, onClose, onChanged }) {
  const { toast, confirm } = useFeedback()
  const [busy, setBusy] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  if (!order) return null

  const wa = whatsappLink(order.customer_phone.replace(/\D/g, '').replace(/^0/, '234'), `Hello ${order.customer_name}, this is Cake Factory about your order #${order.order_number.slice(0, 8).toUpperCase()}. `)

  const changeStatus = async (next) => {
    if (next === 'CANCELLED') {
      const ok = await confirm({
        title: 'Cancel this order?',
        message: 'The reserved stock will be returned. If the customer already paid, remember to record a refund.',
        confirmLabel: 'Yes, cancel order', cancelLabel: 'Keep order', danger: true,
      })
      if (!ok) return
    }
    setBusy(next)
    try {
      await adminApi.patch(`/orders/${order.id}/status/`, { status: next })
      toast(next === 'CANCELLED' ? 'Order cancelled and stock restored' : `Order marked as ${ORDER_STATUS[next].label.toLowerCase()}`)
      onChanged()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy('')
    }
  }

  const forward = order.allowed_next_statuses.filter((s) => s !== 'CANCELLED')
  const canCancel = order.allowed_next_statuses.includes('CANCELLED')

  return (
    <Drawer open onClose={onClose} title={order.customer_name} subtitle={`Order #${order.order_number.slice(0, 8).toUpperCase()} · placed ${formatDateTime(order.created_at)}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge map={ORDER_STATUS} value={order.status} />
        <StatusBadge map={PAYMENT_STATUS} value={order.payment_status} />
        {order.is_advance_order && <span className="badge bg-sky-100 text-sky-800"><CalendarClock className="h-3 w-3" /> Advance order</span>}
      </div>

      {(forward.length > 0 || canCancel) && (
        <section className="card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-cocoa-500">Next step</h3>
          <div className="flex flex-wrap gap-2">
            {forward.map((s) => (
              <button key={s} className="btn btn-primary" disabled={Boolean(busy)} onClick={() => changeStatus(s)}>
                {busy === s && <Loader2 className="h-4 w-4 animate-spin" />} {ACTION_LABEL[s]}
              </button>
            ))}
            {canCancel && <button className="btn btn-danger" disabled={Boolean(busy)} onClick={() => changeStatus('CANCELLED')}>{ACTION_LABEL.CANCELLED}</button>}
          </div>
          {order.status === 'PENDING' && order.is_advance_order && <p className="text-xs text-cocoa-500">Advance order: check you can prepare it for {formatDate(order.fulfillment_date)} before confirming.</p>}
        </section>
      )}

      <section className="card space-y-2 text-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-cocoa-500">Customer</h3>
        <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-cocoa-400" /> <a className="font-semibold hover:text-berry-600" href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></p>
        {order.customer_email && <p className="text-cocoa-600">{order.customer_email}</p>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp customer</a>}
        <div className="border-t border-cocoa-100 pt-3">
          <p className="flex items-center gap-2 font-semibold">{order.fulfillment_method === 'DELIVERY' ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}{order.fulfillment_method === 'DELIVERY' ? 'Delivery' : 'Pickup'} · {formatDate(order.fulfillment_date)} {formatTime(order.fulfillment_time)}</p>
          {order.delivery_address && <p className="mt-1 whitespace-pre-line text-cocoa-600">{order.delivery_address}</p>}
          {order.delivery_notes && <p className="mt-1 text-xs text-cocoa-500">Note: {order.delivery_notes}</p>}
        </div>
        {order.customer_notes && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Customer note: {order.customer_notes}</p>}
      </section>

      <section className="card">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cocoa-500">Items</h3>
        <ul className="divide-y divide-cocoa-100 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2"><span>{i.quantity} × {i.product_name} <span className="text-cocoa-400">@ {naira(i.unit_price)}</span></span><span className="font-semibold">{naira(i.line_total)}</span></li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-cocoa-100 pt-3 text-sm">
          <div className="flex justify-between"><span className="text-cocoa-500">Subtotal</span><span>{naira(order.subtotal)}</span></div>
          {Number(order.delivery_fee) > 0 && <div className="flex justify-between"><span className="text-cocoa-500">Delivery fee</span><span>{naira(order.delivery_fee)}</span></div>}
          <div className="flex justify-between font-display text-lg font-semibold"><span>Total</span><span>{naira(order.total_amount)}</span></div>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-cocoa-500">Payments</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setPayOpen(true)}>Record payment / refund</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-emerald-50 p-3"><p className="font-display text-lg font-semibold">{naira(order.amount_paid)}</p>Received</div>
          <div className="rounded-2xl bg-amber-50 p-3"><p className="font-display text-lg font-semibold">{naira(order.balance_due)}</p>Balance</div>
          <div className="rounded-2xl bg-cocoa-50 p-3"><p className="font-display text-lg font-semibold">{naira(order.amount_refunded)}</p>Refunded</div>
        </div>
        {order.payments.length > 0 && (
          <ul className="mt-3 divide-y divide-cocoa-100 text-sm">
            {order.payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <span>
                  <span className={`font-semibold ${p.kind === 'REFUND' ? 'text-red-600' : 'text-emerald-700'}`}>{p.kind === 'REFUND' ? 'Refund' : 'Payment'}</span>
                  <span className="text-cocoa-500"> · {p.method.toLowerCase()} · {formatDateTime(p.created_at)}</span>
                  {p.reference && <span className="block text-xs text-cocoa-400">Ref {p.reference}</span>}
                </span>
                <span className="font-semibold">{p.kind === 'REFUND' ? '−' : ''}{naira(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} order={order} onSaved={() => { setPayOpen(false); onChanged() }} />
    </Drawer>
  )
}

function PaymentModal({ open, onClose, order, onSaved }) {
  const { toast } = useFeedback()
  const net = Number(order.amount_paid)
  const [form, setForm] = useState({ kind: 'PAYMENT', amount: '', method: 'TRANSFER', reference: '', note: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const refund = form.kind === 'REFUND'
  const suggested = refund ? net : Number(order.balance_due)

  const save = async () => {
    setErrors({})
    if (!Number(form.amount) || Number(form.amount) <= 0) { setErrors({ amount: 'Enter an amount.' }); return }
    setBusy(true)
    try {
      await adminApi.post(`/orders/${order.id}/payments/`, form)
      toast(refund ? 'Refund recorded' : 'Payment recorded')
      setForm({ kind: 'PAYMENT', amount: '', method: 'TRANSFER', reference: '', note: '' })
      onSaved()
    } catch (e) {
      const fe = fieldErrors(e)
      setErrors(fe)
      if (!Object.keys(fe).length) toast(errorMessage(e), 'error')
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={refund ? 'Record a refund' : 'Record a payment'}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button></>}>
      <div className="space-y-4">
        <div className="flex rounded-full bg-cocoa-100 p-1">
          {[['PAYMENT', 'Payment received'], ['REFUND', 'Refund paid out']].map(([v, l]) => (
            <button key={v} onClick={() => setForm((f) => ({ ...f, kind: v, amount: '' }))} className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${form.kind === v ? 'bg-white shadow-card' : 'text-cocoa-600'}`}>{l}</button>
          ))}
        </div>
        <Field label="Amount (₦)" error={errors.amount} hint={suggested > 0 ? `${refund ? 'Most you can refund' : 'Balance due'}: ${naira(suggested)}` : undefined}>
          <div className="flex gap-2">
            <Input type="number" min="0" inputMode="decimal" value={form.amount} onChange={set('amount')} error={errors.amount} autoFocus />
            {suggested > 0 && <button type="button" className="btn btn-secondary" onClick={() => setForm((f) => ({ ...f, amount: String(suggested) }))}>Full</button>}
          </div>
        </Field>
        <Field label="Method">
          <Select value={form.method} onChange={set('method')}>
            <option value="CASH">Cash</option><option value="TRANSFER">Bank transfer</option><option value="POS">POS / Card</option><option value="ONLINE">Online (gateway)</option><option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Reference (optional)" error={errors.reference} hint="Transfer reference or receipt number. Each reference can only be used once."><Input value={form.reference} onChange={set('reference')} error={errors.reference} /></Field>
        <Field label="Note (optional)"><Input value={form.note} onChange={set('note')} /></Field>
      </div>
    </Modal>
  )
}
