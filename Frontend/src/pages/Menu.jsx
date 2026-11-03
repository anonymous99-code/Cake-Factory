import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import BookingDateBar from '../components/BookingDateBar'
import ProductCard, { ProductGridSkeleton } from '../components/ProductCard'
import { EmptyState, ErrorBox } from '../components/ui'
import { useCart } from '../context/CartContext'
import { CATEGORIES } from '../lib/format'
import { fetchBookable } from '../lib/bookable'
import { useFetch } from '../lib/useFetch'

export default function Menu() {
  const { bookingDate } = useCart()
  const { data, loading, error, reloadLoud } = useFetch(() => fetchBookable(bookingDate), [bookingDate])
  const [category, setCategory] = useState('ALL')
  const [query, setQuery] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  const products = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data || []).filter(
      (p) =>
        (category === 'ALL' || p.category === category) &&
        (!onlyAvailable || p.in_stock) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    )
  }, [data, category, query, onlyAvailable])

  const chip = (active) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-cocoa-900 text-white' : 'bg-white text-cocoa-700 ring-1 ring-cocoa-200 hover:bg-cocoa-50'}`

  return (
    <div className="container-page py-10">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-berry-500">Our menu</p>
        <h1 className="section-title mt-1">Snacks, cakes &amp; small chops</h1>
        <p className="mt-2 text-cocoa-500">Everything is made in small batches. Order for today, or book ahead for a day that suits you.</p>
      </div>

      <div className="mt-6 max-w-3xl"><BookingDateBar /></div>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categories">
          <button className={chip(category === 'ALL')} onClick={() => setCategory('ALL')}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} className={chip(category === c.value)} onClick={() => setCategory(c.value)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-cocoa-600">
            <input type="checkbox" className="h-4 w-4 rounded border-cocoa-300 text-berry-500 focus:ring-berry-400" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
            In stock only
          </label>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" />
            <input className="input pl-10" placeholder="Search the menu" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the menu" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <ProductGridSkeleton />
        ) : error ? (
          <ErrorBox message={error} onRetry={reloadLoud} />
        ) : products.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : bookingDate && !data?.length ? (
          <EmptyState title="Nothing is scheduled for this day yet">
            Try another date, or order for today. For a special request, send us a catering or event inquiry.
          </EmptyState>
        ) : (
          <EmptyState title={data?.length ? 'Nothing matches your search' : 'The menu is being prepared'}>
            {data?.length ? 'Try another category or clear the search.' : 'Please check back soon, or contact us to ask what is available.'}
          </EmptyState>
        )}
      </div>
    </div>
  )
}