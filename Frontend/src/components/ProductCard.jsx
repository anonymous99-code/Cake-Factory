import { Link } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useSettings } from '../context/SettingsContext'
import { categoryLabel, naira } from '../lib/format'
import { Badge, ProductImage } from './ui'

export default function ProductCard({ product }) {
  const { add, lines } = useCart()
  const { settings } = useSettings()
  const [justAdded, setJustAdded] = useState(false)
  const inCart = lines.find((l) => l.product.id === product.id)?.quantity || 0
  const soldOut = !product.in_stock
  const atLimit = inCart >= product.available_quantity
  const low = !soldOut && product.available_quantity <= 5

  const handleAdd = () => {
    add(product, 1)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-cocoa-100 transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link to={`/menu/${product.id}`} className="relative block aspect-[4/3] overflow-hidden bg-cocoa-50">
        <div className="h-full w-full transition duration-500 group-hover:scale-105">
          <ProductImage product={product} />
        </div>
        <div className="absolute left-3 top-3 flex gap-2">
          {soldOut && <Badge tone="bg-cocoa-900 text-white">Sold out</Badge>}
          {low && <Badge tone="bg-caramel-100 text-caramel-600">Only {product.available_quantity} left</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-berry-500">{categoryLabel(product.category)}</p>
        <Link to={`/menu/${product.id}`}>
          <h3 className="mt-1 text-xl font-semibold leading-snug hover:text-berry-600">{product.name}</h3>
        </Link>
        {product.description && <p className="mt-1.5 line-clamp-2 text-sm text-cocoa-500">{product.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <p className="font-display text-2xl font-semibold text-cocoa-900">{naira(product.price)}</p>
          <button
            className={`btn btn-sm ${justAdded ? 'bg-emerald-500 text-white' : 'btn-primary'}`}
            onClick={handleAdd}
            disabled={soldOut || atLimit || !settings.accepts_orders}
            aria-label={`Add ${product.name} to cart`}
          >
            {justAdded ? <><Check className="h-4 w-4" /> Added</> : <><Plus className="h-4 w-4" /> {soldOut ? 'Unavailable' : atLimit ? 'Max added' : 'Add'}</>}
          </button>
        </div>
      </div>
    </article>
  )
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-3xl bg-white ring-1 ring-cocoa-100">
          <div className="aspect-[4/3] animate-pulse bg-cocoa-100" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-1/4 animate-pulse rounded bg-cocoa-100" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-cocoa-100" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-cocoa-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
