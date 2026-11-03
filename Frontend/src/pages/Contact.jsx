import { Link } from 'react-router-dom'
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import { whatsappLink } from '../lib/format'

export default function Contact() {
  const { settings } = useSettings()
  const wa = whatsappLink(settings.whatsapp_number, `Hello ${settings.business_name}! `)
  const rows = [
    settings.address && { icon: MapPin, label: 'Address', value: settings.address },
    settings.phone_number && { icon: Phone, label: 'Phone', value: settings.phone_number, href: `tel:${settings.phone_number}` },
    settings.email && { icon: Mail, label: 'Email', value: settings.email, href: `mailto:${settings.email}` },
    settings.opening_hours && { icon: Clock, label: 'Opening hours', value: settings.opening_hours },
  ].filter(Boolean)

  return (
    <div className="container-page max-w-4xl py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-berry-500">Contact</p>
      <h1 className="section-title mt-1">We&apos;d love to hear from you</h1>
      <p className="mt-3 max-w-xl text-cocoa-600">Questions about an order, a custom cake, or an upcoming event? Reach out any time.</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="card flex items-center gap-4 bg-[#25D366]/10 ring-[#25D366]/30 transition hover:shadow-soft md:col-span-2">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#25D366] text-white"><MessageCircle className="h-7 w-7" /></span>
            <span><span className="block font-display text-xl font-semibold">Chat on WhatsApp</span><span className="text-sm text-cocoa-600">The fastest way to reach us for questions, custom orders and quotations.</span></span>
          </a>
        )}
        {rows.map(({ icon: I, label, value, href }) => (
          <div key={label} className="card flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-berry-50 text-berry-600"><I className="h-6 w-6" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cocoa-500">{label}</p>
              {href ? <a href={href} className="font-semibold hover:text-berry-600">{value}</a> : <p className="whitespace-pre-line font-semibold">{value}</p>}
            </div>
          </div>
        ))}
        {!rows.length && !wa && (
          <div className="card md:col-span-2">
            <p className="font-semibold">Our contact details are being set up.</p>
            <p className="mt-1 text-sm text-cocoa-500">In the meantime you can send a <Link className="font-semibold text-berry-600" to="/catering">catering or event inquiry</Link> and we will get back to you.</p>
          </div>
        )}
        {settings.google_maps_url && (
          <a href={settings.google_maps_url} target="_blank" rel="noreferrer" className="btn btn-secondary md:col-span-2"><ExternalLink className="h-4 w-4" /> Open in Google Maps</a>
        )}
      </div>
    </div>
  )
}
