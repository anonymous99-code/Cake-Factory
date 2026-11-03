import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, CalendarDays, Loader2, MapPin, MessageCircle, Phone, Search, Users } from 'lucide-react'
import { PageHeader } from '../../components/AdminLayout'
import { useFeedback } from '../../components/feedback'
import { Drawer, EmptyState, ErrorBox, Field, Input, Modal, PageLoader, Select, StatusBadge, Textarea } from '../../components/ui'
import { adminApi, errorMessage, fieldErrors } from '../../lib/api'
import { BOOKING_STATUS, formatDate, formatDateTime, INQUIRY_STATUS, naira, serviceLabel, whatsappLink } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

// /admin/catering and /admin/event-planning show the same workflow, filtered by service.
const MODES = {
  catering: { title: 'Catering', subtitle: 'Review inquiries, agree prices and manage bookings.', types: 'CATERING,BOTH' },
  event: { title: 'Event planning', subtitle: 'Review event-planning requests, send quotations and manage bookings.', types: 'EVENT_PLANNING,BOTH' },
}
const ACTION = { CONTACTED: 'Mark as contacted', QUOTATION_SENT: 'Mark quotation as sent', DECLINED: 'Decline' }

export default function Catering({ mode }) {
  const cfg = MODES[mode]
  const [tab, setTab] = useState('inquiries')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const inquiries = useFetch(() => adminApi.get('/catering/inquiries/all/', { params: { status, q, service_type: cfg.types } }).then((r) => r.data), [status, q, mode])
  const bookings = useFetch(() => adminApi.get('/catering/bookings/').then((r) => r.data.filter((b) => (cfg.types.split(',').includes(b.service_type)))), [mode])
  const refreshRef = useRef(null)
  refreshRef.current = () => { inquiries.reload(); bookings.reload() }
  useEffect(() => {
    const timer = setInterval(() => refreshRef.current(), 30000)
    return () => clearInterval(timer)
  }, [])
  const [openId, setOpenId] = useState(null)
  const [openBooking, setOpenBooking] = useState(null)
  const selected = inquiries.data?.find((i) => i.id === openId)

  const refresh = () => { inquiries.reload(); bookings.reload() }
  const tabBtn = (v, l) => <button onClick={() => setTab(v)} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === v ? 'bg-cocoa-900 text-white' : 'bg-white ring-1 ring-cocoa-200 hover:bg-cocoa-50'}`}>{l}</button>

  return (
    <>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} />
      <div className="mb-5 flex gap-2">{tabBtn('inquiries', 'Inquiries')}{tabBtn('bookings', `Confirmed bookings${bookings.data ? ` (${bookings.data.length})` : ''}`)}</div>

      {tab === 'inquiries' ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {[['', 'All'], ...Object.entries(INQUIRY_STATUS).map(([v, s]) => [v, s.label])].map(([v, l]) => (
                <button key={v} onClick={() => setStatus(v)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${status === v ? 'bg-berry-500 text-white' : 'bg-white text-cocoa-700 ring-1 ring-cocoa-200 hover:bg-cocoa-50'}`}>{l}</button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-64"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" /><Input className="pl-10" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          {inquiries.loading && !inquiries.data ? <PageLoader /> : inquiries.error ? <ErrorBox message={inquiries.error} onRetry={inquiries.reloadLoud} /> : !inquiries.data.length ? (
            <EmptyState title="No inquiries here">Requests from the website form will appear here.</EmptyState>
          ) : (
            <div className="space-y-3">
              {inquiries.data.map((i) => (
                <button key={i.id} onClick={() => setOpenId(i.id)} className="card flex w-full flex-wrap items-center justify-between gap-3 text-left transition hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-berry-400">
                  <div>
                    <p className="font-display text-lg font-semibold">{i.event_type} <span className="text-cocoa-400">·</span> {i.customer_name}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-cocoa-500">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(i.event_date)}</span>
                      {i.estimated_guest_count && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{i.estimated_guest_count} guests</span>}
                      <span>{serviceLabel(i.service_type)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {i.quoted_amount && <span className="font-semibold">{naira(i.quoted_amount)}</span>}
                    <StatusBadge map={INQUIRY_STATUS} value={i.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : bookings.loading && !bookings.data ? <PageLoader /> : bookings.error ? <ErrorBox message={bookings.error} onRetry={bookings.reloadLoud} /> : !bookings.data.length ? (
        <EmptyState title="No confirmed bookings yet">When a customer accepts a quotation, the booking appears here.</EmptyState>
      ) : (
        <div className="space-y-3">
          {bookings.data.map((b) => (
            <button key={b.id} onClick={() => setOpenBooking(b)} className="card flex w-full flex-wrap items-center justify-between gap-3 text-left transition hover:shadow-soft">
              <div>
                <p className="font-display text-lg font-semibold">{b.event_type} · {b.customer_name}</p>
                <p className="text-xs text-cocoa-500">{formatDate(b.event_date)} · {serviceLabel(b.service_type)}</p>
              </div>
              <div className="flex items-center gap-4 text-right text-sm">
                <div><p className="font-semibold">{naira(b.agreed_amount)}</p><p className="text-xs text-cocoa-500">Balance {naira(b.outstanding_balance)}</p></div>
                <StatusBadge map={BOOKING_STATUS} value={b.status} />
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <InquiryDrawer inquiry={selected} onClose={() => setOpenId(null)} onChanged={refresh} />}
      {openBooking && <BookingModal booking={openBooking} onClose={() => setOpenBooking(null)} onSaved={() => { setOpenBooking(null); refresh() }} />}
    </>
  )
}

function InquiryDrawer({ inquiry, onClose, onChanged }) {
  const { toast, confirm } = useFeedback()
  const [quote, setQuote] = useState(inquiry.quoted_amount || '')
  const [notes, setNotes] = useState(inquiry.internal_notes || '')
  const [busy, setBusy] = useState('')
  const [accepting, setAccepting] = useState(false)
  const wa = whatsappLink(inquiry.customer_phone.replace(/\D/g, '').replace(/^0/, '234'), `Hello ${inquiry.customer_name}, this is Cake Factory about your ${inquiry.event_type}. `)
  const next = inquiry.allowed_next_statuses
  const locked = inquiry.status === 'ACCEPTED'

  const saveNotes = async () => {
    setBusy('save')
    try {
      await adminApi.patch(`/catering/inquiries/${inquiry.id}/`, { internal_notes: notes, quoted_amount: quote || null })
      toast('Saved'); onChanged()
    } catch (e) { toast(fieldErrors(e).quoted_amount || errorMessage(e), 'error') } finally { setBusy('') }
  }

  const move = async (status) => {
    if (status === 'DECLINED') {
      const ok = await confirm({ title: 'Decline this inquiry?', message: 'You can reopen it later by marking it as contacted.', confirmLabel: 'Decline', danger: true })
      if (!ok) return
    }
    setBusy(status)
    try {
      await adminApi.patch(`/catering/inquiries/${inquiry.id}/status/`, { status, ...(status === 'QUOTATION_SENT' && quote ? { quoted_amount: quote } : {}) })
      toast('Status updated'); onChanged()
    } catch (e) { toast(fieldErrors(e).quoted_amount || errorMessage(e), 'error') } finally { setBusy('') }
  }

  const Row = ({ label, children }) => <div><dt className="text-xs font-semibold uppercase tracking-wide text-cocoa-500">{label}</dt><dd className="mt-0.5 text-sm font-medium">{children}</dd></div>

  return (
    <Drawer open onClose={onClose} title={`${inquiry.event_type} · ${inquiry.customer_name}`} subtitle={`${serviceLabel(inquiry.service_type)} · received ${formatDateTime(inquiry.created_at)}`}>
      <StatusBadge map={INQUIRY_STATUS} value={inquiry.status} />

      <section className="card space-y-3">
        <dl className="grid grid-cols-2 gap-4">
          <Row label="Event date">{formatDate(inquiry.event_date)}</Row>
          <Row label="Guests">{inquiry.estimated_guest_count || '—'}</Row>
          <Row label="Customer budget">{inquiry.customer_budget ? naira(inquiry.customer_budget) : 'Not given'}</Row>
          <Row label="Phone"><a href={`tel:${inquiry.customer_phone}`} className="inline-flex items-center gap-1 hover:text-berry-600"><Phone className="h-3.5 w-3.5" />{inquiry.customer_phone}</a></Row>
        </dl>
        {inquiry.customer_email && <p className="text-sm text-cocoa-600">{inquiry.customer_email}</p>}
        <p className="flex gap-2 text-sm text-cocoa-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{inquiry.event_location}</p>
        {inquiry.requirements && <p className="whitespace-pre-line rounded-2xl bg-cocoa-50 p-3 text-sm">{inquiry.requirements}</p>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp customer</a>}
      </section>

      <section className="card space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-cocoa-500">Quotation &amp; notes</h3>
        <Field label="Quoted price (₦)" hint="The price you agreed to quote after speaking with the customer."><Input type="number" min="0" value={quote} onChange={(e) => setQuote(e.target.value)} disabled={locked} /></Field>
        <Field label="Private notes" hint="Only you can see these."><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <button className="btn btn-secondary btn-sm" onClick={saveNotes} disabled={Boolean(busy)}>{busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />} Save quotation &amp; notes</button>
      </section>

      {inquiry.booking ? (
        <section className="card flex items-start gap-3 bg-emerald-50 ring-emerald-100">
          <BadgeCheck className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="text-sm"><p className="font-semibold">Booked for {naira(inquiry.booking.agreed_amount)}</p><p className="text-cocoa-600">Deposit {naira(inquiry.booking.deposit_amount)} · balance {naira(inquiry.booking.outstanding_balance)}. Manage it from the Confirmed bookings tab.</p></div>
        </section>
      ) : (
        <section className="card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-cocoa-500">Next step</h3>
          <div className="flex flex-wrap gap-2">
            {next.filter((s) => s !== 'DECLINED').map((s) => <button key={s} className="btn btn-primary" disabled={Boolean(busy)} onClick={() => move(s)}>{busy === s && <Loader2 className="h-4 w-4 animate-spin" />}{ACTION[s]}</button>)}
            {inquiry.status === 'QUOTATION_SENT' && <button className="btn btn-dark" onClick={() => setAccepting(true)}>Customer accepted</button>}
            {next.includes('DECLINED') && <button className="btn btn-danger" disabled={Boolean(busy)} onClick={() => move('DECLINED')}>Decline</button>}
          </div>
        </section>
      )}
      {accepting && <AcceptModal inquiry={inquiry} quote={quote} onClose={() => setAccepting(false)} onDone={() => { setAccepting(false); onChanged() }} />}
    </Drawer>
  )
}

function AcceptModal({ inquiry, quote, onClose, onDone }) {
  const { toast } = useFeedback()
  const [agreed, setAgreed] = useState(quote || inquiry.quoted_amount || '')
  const [deposit, setDeposit] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true); setErrors({})
    try {
      await adminApi.post(`/catering/inquiries/${inquiry.id}/accept/`, { agreed_amount: agreed, deposit_amount: deposit || 0, notes })
      toast('Booking confirmed'); onDone()
    } catch (e) { const fe = fieldErrors(e); setErrors(fe); if (!Object.keys(fe).length) toast(errorMessage(e), 'error') } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title="Confirm booking" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm booking</button></>}>
      <div className="space-y-4">
        <Field label="Agreed price (₦)" error={errors.agreed_amount}><Input type="number" min="0" value={agreed} onChange={(e) => setAgreed(e.target.value)} error={errors.agreed_amount} /></Field>
        <Field label="Deposit received so far (₦)" error={errors.deposit_amount} hint="Leave empty if nothing has been paid yet."><Input type="number" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} error={errors.deposit_amount} /></Field>
        <Field label="Booking notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        {errors.status && <p className="text-sm font-medium text-red-600">{errors.status}</p>}
      </div>
    </Modal>
  )
}

function BookingModal({ booking, onClose, onSaved }) {
  const { toast } = useFeedback()
  const [form, setForm] = useState({ status: booking.status, deposit_amount: booking.deposit_amount, agreed_amount: booking.agreed_amount, notes: booking.notes })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true); setErrors({})
    try { await adminApi.patch(`/catering/bookings/${booking.id}/`, form); toast('Booking updated'); onSaved() }
    catch (e) { const fe = fieldErrors(e); setErrors(fe); if (!Object.keys(fe).length) toast(errorMessage(e), 'error') } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={`${booking.event_type} · ${booking.customer_name}`} footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button></>}>
      <div className="space-y-4">
        <p className="text-sm text-cocoa-500">{formatDate(booking.event_date)} · {serviceLabel(booking.service_type)}</p>
        <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(BOOKING_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Agreed price (₦)" error={errors.agreed_amount}><Input type="number" min="0" value={form.agreed_amount} onChange={(e) => setForm({ ...form, agreed_amount: e.target.value })} error={errors.agreed_amount} /></Field>
          <Field label="Received so far (₦)" error={errors.deposit_amount}><Input type="number" min="0" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} error={errors.deposit_amount} /></Field>
        </div>
        <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Balance: {naira(Number(form.agreed_amount || 0) - Number(form.deposit_amount || 0))}</p>
        <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}
