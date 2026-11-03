import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, ChefHat, Clock, MessageCircle, PartyPopper, ShoppingBag, Sparkles, Truck } from 'lucide-react'
import ProductCard, { ProductGridSkeleton } from '../components/ProductCard'
import { ErrorBox } from '../components/ui'
import { useSettings } from '../context/SettingsContext'
import { useCart } from '../context/CartContext'
import { fetchBookable } from '../lib/bookable'
import { formatDate, whatsappLink } from '../lib/format'
import { useFetch } from '../lib/useFetch'

const features = [
  { icon: Sparkles, title: 'Made fresh, daily', text: 'Our snacks are prepared in small batches and sold until they run out.' },
  { icon: CalendarClock, title: 'Order ahead', text: 'Need it for a specific day? Book in advance and pick a date and time.' },
  { icon: Truck, title: 'Pickup or delivery', text: 'Collect your order yourself, or have it delivered where delivery is available.' },
  { icon: ChefHat, title: 'Catering & events', text: 'Tell us about your event and receive a personal quotation.' },
]

export default function Home() {
  const { settings } = useSettings()
  const { bookingDate } = useCart()
  const { data, loading, error, reloadLoud } = useFetch(() => fetchBookable(bookingDate), [bookingDate])
  const featured = (data || []).filter((p) => p.in_stock).slice(0, 3)
  const wa = whatsappLink(settings.whatsapp_number, 'Hello! I would like to ask about an order.')

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-berry-100 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-32 h-96 w-96 rounded-full bg-caramel-100 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 py-12 lg:grid-cols-2 lg:py-20">
          <div className="animate-rise">
            <span className="badge bg-white text-berry-600 shadow-card ring-1 ring-berry-100">
              <Sparkles className="h-3.5 w-3.5" /> Fresh snacks · Cakes · Catering
            </span>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              Baked with love,<br />
              <span className="text-berry-500">served fresh.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-cocoa-600">
              {settings.tagline}. Order today&apos;s snacks, book ahead for a special day, or let us handle the food and
              the fun at your next event.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/menu" className="btn btn-primary btn-lg"><ShoppingBag className="h-5 w-5" /> Order now</Link>
              <Link to="/catering" className="btn btn-secondary btn-lg">Plan an event</Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-cocoa-600">
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-berry-500" /> Same-day or advance orders</span>
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-berry-500" /> Pickup &amp; delivery</span>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-md animate-rise [animation-delay:150ms]">
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-berry-400 to-caramel-300 shadow-soft" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="animate-float text-[9rem] drop-shadow-2xl sm:text-[11rem]" role="img" aria-label="Cake">🎂</span>
            </div>
            <div className="absolute -left-2 top-10 animate-float rounded-2xl bg-white px-4 py-3 shadow-soft [animation-delay:1s]">
              <p className="text-2xl">🥧</p>
              <p className="text-xs font-bold">Fresh snacks</p>
            </div>
            <div className="absolute -right-2 bottom-16 animate-float rounded-2xl bg-white px-4 py-3 shadow-soft [animation-delay:2s]">
              <p className="text-2xl">🎉</p>
              <p className="text-xs font-bold">Events &amp; catering</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-page py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card transition hover:-translate-y-1 hover:shadow-soft">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-berry-50 text-berry-600"><Icon className="h-6 w-6" /></span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-cocoa-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container-page py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-berry-500">On the menu</p>
            <h2 className="section-title mt-1">{bookingDate ? `Available on ${formatDate(bookingDate)}` : 'Available right now'}</h2>
          </div>
          <Link to="/menu" className="btn btn-ghost">See the full menu <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {loading ? (
          <ProductGridSkeleton count={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reloadLoud} />
        ) : featured.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="card text-center">
            <p className="text-4xl">🍰</p>
            <p className="mt-2 font-semibold">Today&apos;s batch is sold out or not ready yet.</p>
            <p className="text-sm text-cocoa-500">Check the menu, or book ahead for another day.</p>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="container-page py-10">
        <div className="rounded-[2.5rem] bg-cocoa-900 px-6 py-14 text-white sm:px-12">
          <h2 className="section-title !text-white">How ordering works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              ['1', 'Choose your treats', 'Browse what is available and add it to your cart.'],
              ['2', 'Pick a date & how to receive it', 'Today or later, pickup or delivery. We check stock for you.'],
              ['3', 'We confirm your order', 'You get an order page to follow its progress, and we reach out if needed.'],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-berry-500 font-display text-lg font-bold">{n}</span>
                <div>
                  <h3 className="text-lg font-semibold !text-white">{t}</h3>
                  <p className="mt-1 text-sm text-cocoa-300">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events CTA */}
      <section className="container-page py-14">
        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/catering" className="group card relative overflow-hidden bg-gradient-to-br from-berry-50 to-white p-8 transition hover:shadow-soft">
            <ChefHat className="h-10 w-10 text-berry-500" />
            <h3 className="mt-4 text-2xl font-semibold">Catering</h3>
            <p className="mt-2 text-cocoa-600">Weddings, birthdays, corporate events. Share your plans and get a personal quotation.</p>
            <span className="mt-5 inline-flex items-center gap-2 font-semibold text-berry-600">Request a quote <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>
          <Link to="/event-planning" className="group card relative overflow-hidden bg-gradient-to-br from-caramel-50 to-white p-8 transition hover:shadow-soft">
            <PartyPopper className="h-10 w-10 text-caramel-500" />
            <h3 className="mt-4 text-2xl font-semibold">Event planning</h3>
            <p className="mt-2 text-cocoa-600">Let us help plan the day, from food to the finer details. Tell us what you have in mind.</p>
            <span className="mt-5 inline-flex items-center gap-2 font-semibold text-caramel-600">Start planning <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>
        </div>
        {wa && (
          <div className="mt-8 text-center">
            <a href={wa} target="_blank" rel="noreferrer" className="btn btn-secondary"><MessageCircle className="h-4 w-4 text-[#25D366]" /> Questions? Chat with us on WhatsApp</a>
          </div>
        )}
      </section>
    </>
  )
}
