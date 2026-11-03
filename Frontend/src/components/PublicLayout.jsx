import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Clock, Mail, MapPin, Menu, MessageCircle, Phone, ShoppingBag, X } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useSettings } from '../context/SettingsContext'
import { whatsappLink } from '../lib/format'

const links = [
  { to: '/menu', label: 'Menu' },
  { to: '/catering', label: 'Catering' },
  { to: '/event-planning', label: 'Event planning' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  const { count } = useCart()
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const wa = whatsappLink(settings.whatsapp_number, `Hello ${settings.business_name}! `)

  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [location.pathname])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-berry-50 text-berry-700' : 'text-cocoa-700 hover:bg-cocoa-100'}`

  return (
    <div className="flex min-h-screen flex-col">
      {!settings.accepts_orders && (
        <div className="bg-cocoa-900 px-4 py-2 text-center text-sm text-cream">
          We are not taking online orders right now.{wa && ' Message us on WhatsApp and we will help.'}
        </div>
      )}
      <header className={`sticky top-0 z-40 transition ${scrolled ? 'bg-cream/90 shadow-card backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2" aria-label={`${settings.business_name} home`}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-berry-500 text-xl shadow-md shadow-berry-500/30">🎂</span>
            <span className="font-display text-xl font-bold text-cocoa-900">{settings.business_name}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/cart" className="btn btn-dark relative" aria-label={`Cart, ${count} items`}>
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-berry-500 px-1 text-[11px] font-bold">{count}</span>
              )}
            </Link>
            <button className="btn btn-ghost px-3 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={open}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="container-page animate-rise pb-4 lg:hidden" aria-label="Mobile">
            <div className="card flex flex-col gap-1 p-2">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-20 bg-cocoa-900 text-cocoa-200">
        <div className="container-page grid gap-10 py-14 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl font-bold text-white">🎂 {settings.business_name}</p>
            <p className="mt-3 max-w-xs text-sm text-cocoa-300">{settings.tagline}. Order online, book ahead, or let us cater your next event.</p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Explore</p>
            <ul className="space-y-2 text-sm">
              {links.map((l) => (
                <li key={l.to}><Link className="hover:text-white" to={l.to}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">Find us</p>
            <ul className="space-y-3 text-sm">
              {settings.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{settings.address}</li>}
              {settings.phone_number && <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" />{settings.phone_number}</li>}
              {settings.email && <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" />{settings.email}</li>}
              {settings.opening_hours && <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" /><span className="whitespace-pre-line">{settings.opening_hours}</span></li>}
              {!settings.address && !settings.phone_number && !settings.email && !wa && (
                <li className="text-cocoa-400">Contact details will appear here soon.</li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-cocoa-400">
          © {new Date().getFullYear()} {settings.business_name}. All rights reserved.
        </div>
      </footer>

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-soft transition hover:scale-105"
          aria-label="Chat with us on WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </div>
  )
}
