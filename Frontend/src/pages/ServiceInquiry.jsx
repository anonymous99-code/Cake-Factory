import { useState } from 'react'
import { CheckCircle2, ChefHat, Loader2, MessageCircle, PartyPopper, PhoneCall, ReceiptText, Send } from 'lucide-react'
import { Field, Input, Select, Textarea } from '../components/ui'
import { useSettings } from '../context/SettingsContext'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { SERVICE_TYPES, toDateInput, whatsappLink } from '../lib/format'

const copy = {
  catering: {
    icon: ChefHat,
    eyebrow: 'Catering',
    title: 'Food for your next gathering',
    text: 'Tell us about your event and what you need. We will review it, contact you, and send a personal quotation.',
    defaultType: 'CATERING',
  },
  event: {
    icon: PartyPopper,
    eyebrow: 'Event planning',
    title: "Let's plan your event together",
    text: 'Share your ideas, date and budget. We will get in touch to discuss the details and give you a quotation.',
    defaultType: 'EVENT_PLANNING',
  },
}

const initial = (type) => ({
  service_type: type, customer_name: '', customer_phone: '', customer_email: '',
  event_type: '', event_date: '', event_location: '', estimated_guest_count: '', customer_budget: '', requirements: '',
})

export default function ServiceInquiry({ mode }) {
  const c = copy[mode]
  const { settings } = useSettings()
  const [form, setForm] = useState(initial(c.defaultType))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(null)

  // Switching between /catering and /event-planning resets the form type.
  const [lastMode, setLastMode] = useState(mode)
  if (lastMode !== mode) {
    setLastMode(mode)
    setForm(initial(c.defaultType))
    setSent(null)
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const Icon = c.icon

  const validate = () => {
    const e = {}
    if (form.customer_name.trim().length < 2) e.customer_name = 'Please enter your name.'
    if (form.customer_phone.replace(/\D/g, '').length < 7) e.customer_phone = 'Please enter a valid phone number.'
    if (form.customer_email && !/^\S+@\S+\.\S+$/.test(form.customer_email)) e.customer_email = 'That email does not look right.'
    if (!form.event_type.trim()) e.event_type = 'What kind of event is it?'
    if (!form.event_date) e.event_date = 'Please choose the event date.'
    else if (form.event_date < toDateInput()) e.event_date = 'The event date cannot be in the past.'
    if (!form.event_location.trim()) e.event_location = 'Where will the event take place?'
    if (form.estimated_guest_count && Number(form.estimated_guest_count) < 1) e.estimated_guest_count = 'Enter at least 1 guest.'
    return e
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length) return

    const payload = { ...form }
    payload.estimated_guest_count = form.estimated_guest_count ? Number(form.estimated_guest_count) : null
    payload.customer_budget = form.customer_budget ? form.customer_budget : null

    setSubmitting(true)
    try {
      await api.post('/catering/inquiries/', payload)
      setSent({ name: form.customer_name.trim(), event: form.event_type.trim(), date: form.event_date })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrors(fieldErrors(err))
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const wa = whatsappLink(settings.whatsapp_number, sent ? `Hello! I just sent a ${sent.event} inquiry on your website (${sent.name}).` : 'Hello! I would like to discuss an event.')

  if (sent) {
    return (
      <div className="container-page max-w-2xl py-16">
        <div className="card animate-rise space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="text-3xl font-semibold">Thank you, {sent.name.split(' ')[0]}!</h1>
          <p className="text-cocoa-600">We have received your inquiry for your <strong>{sent.event}</strong>. We will review it and contact you soon to discuss the details and send a quotation.</p>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-dark"><MessageCircle className="h-4 w-4" /> Follow up on WhatsApp</a>}
          <div><button className="btn btn-ghost" onClick={() => { setSent(null); setForm(initial(c.defaultType)) }}>Send another inquiry</button></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-berry-50 text-berry-600"><Icon className="h-7 w-7" /></span>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-berry-500">{c.eyebrow}</p>
          <h1 className="section-title mt-1">{c.title}</h1>
          <p className="mt-3 text-cocoa-600">{c.text}</p>
          <ol className="mt-8 space-y-5">
            {[
              [Send, 'Send your request', 'Fill in the form with your event details.'],
              [PhoneCall, 'We get in touch', 'We call or message you to understand what you need.'],
              [ReceiptText, 'Receive a quotation', 'Pricing depends on your event, so we quote you personally.'],
            ].map(([I, t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cocoa-900 text-white"><I className="h-4 w-4" /></span>
                <div><p className="font-semibold">{i + 1}. {t}</p><p className="text-sm text-cocoa-500">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>

        <form onSubmit={submit} noValidate className="card space-y-5 !p-6 sm:!p-8">
          <Field label="What do you need?" required>
            <Select value={form.service_type} onChange={set('service_type')}>
              {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" required error={errors.customer_name}><Input error={errors.customer_name} value={form.customer_name} onChange={set('customer_name')} autoComplete="name" /></Field>
            <Field label="Phone number" required error={errors.customer_phone}><Input error={errors.customer_phone} type="tel" value={form.customer_phone} onChange={set('customer_phone')} autoComplete="tel" /></Field>
          </div>
          <Field label="Email (optional)" error={errors.customer_email}><Input error={errors.customer_email} type="email" value={form.customer_email} onChange={set('customer_email')} autoComplete="email" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type of event" required error={errors.event_type}><Input error={errors.event_type} value={form.event_type} onChange={set('event_type')} placeholder="Wedding, birthday, corporate…" /></Field>
            <Field label="Event date" required error={errors.event_date}><Input error={errors.event_date} type="date" min={toDateInput()} value={form.event_date} onChange={set('event_date')} /></Field>
          </div>
          <Field label="Event location" required error={errors.event_location}><Textarea rows={2} error={errors.event_location} value={form.event_location} onChange={set('event_location')} placeholder="Venue name and area" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Estimated guests" error={errors.estimated_guest_count}><Input error={errors.estimated_guest_count} type="number" min="1" inputMode="numeric" value={form.estimated_guest_count} onChange={set('estimated_guest_count')} /></Field>
            <Field label="Budget in ₦ (optional)" error={errors.customer_budget} hint="Helps us suggest the right options."><Input error={errors.customer_budget} type="number" min="0" inputMode="numeric" value={form.customer_budget} onChange={set('customer_budget')} /></Field>
          </div>
          <Field label="Requirements and ideas" error={errors.requirements} hint="Menu preferences, services you want, dietary needs, theme…">
            <Textarea rows={4} error={errors.requirements} value={form.requirements} onChange={set('requirements')} />
          </Field>
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{formError}</p>}
          <button className="btn btn-primary btn-lg w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</> : <><Send className="h-5 w-5" /> Send my inquiry</>}
          </button>
          <p className="text-center text-xs text-cocoa-500">Sending an inquiry is free and does not commit you to anything.</p>
        </form>
      </div>
    </div>
  )
}
