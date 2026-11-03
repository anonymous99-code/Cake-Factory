import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, MessageCircle, ShoppingBag } from 'lucide-react'
import { ErrorBox, PageLoader, ProductImage, QuantityStepper, Badge } from '../components/ui'
import { useCart } from '../context/CartContext'
import { useSettings } from '../context/SettingsContext'
import { fetchBookable } from '../lib/bookable'
import { categoryLabel, formatDate, naira, whatsappLink } from '../lib/format'
import { useFetch } from '../lib/useFetch'

export default function ProductDetail() {
  const { id } = useParams()
  const { add, lines, bookingDate } = useCart()
  const { data: product, loading, error, reloadLoud } = useFetch(async () => {
  const list = await fetchBookable(bookingDate)
  const found = list.find((p) => String(p.id) === String(id))
    if (!found) throw new Error('not available')
    return found
  }, [id, bookingDate])
  const { settings } = useSettings()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  if (loading) return <PageLoader />
  if (error)
    return (
      <div className="container-page py-16">
       <ErrorBox message={bookingDate ? `This item is not scheduled for ${formatDate(bookingDate)}. Pick another date or choose something else from the menu.` : 'We could not find that item. It may no longer be available.'} onRetry={reloadLoud} />
        <div className="mt-6 text-center"><Link to="/menu" className="btn btn-secondary">Back to the menu</Link></div>
      </div>
    )

  const inCart = lines.find((l) => l.product.id === product.id)?.quantity || 0
  const room = Math.max(0, product.available_quantity - inCart)
  const wa = whatsappLink(settings.whatsapp_number, `Hello! I have a question about ${product.name}.`)

  return (
    <div className="container-page py-10">
      <Link to="/menu" className="inline-flex items-center gap-2 text-sm font-semibold text-cocoa-600 hover:text-berry-600">
        <ArrowLeft className="h-4 w-4" /> Back to the menu
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-[2rem] shadow-soft ring-1 ring-cocoa-100">
          <ProductImage product={product} emojiClass="text-[10rem]" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-berry-500">{categoryLabel(product.category)}</p>
          <h1 className="mt-1 text-4xl font-bold sm:text-5xl">{product.name}</h1>
          <p className="mt-4 font-display text-4xl font-semibold text-cocoa-900">{naira(product.price)}</p>
          {product.description && <p className="mt-5 leading-relaxed text-cocoa-600">{product.description}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            {product.in_stock ? (
              <Badge tone="bg-emerald-100 text-emerald-800">{product.available_quantity} available {bookingDate ? `on ${formatDate(bookingDate)}` : 'today'}</Badge>
            ) : (
              <Badge tone="bg-cocoa-900 text-white">Sold out {bookingDate ? 'for this day' : 'today'}</Badge>
            )}
            <span className="flex items-center gap-1.5 text-cocoa-500"><Clock className="h-4 w-4" /> About {product.estimated_preparation_minutes} min to prepare</span>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {product.in_stock && room > 0 && (
              <QuantityStepper value={qty} min={1} max={room} onChange={setQty} />
            )}
            <button
              className="btn btn-primary btn-lg"
              disabled={!product.in_stock || room === 0 || !settings.accepts_orders}
              onClick={() => {
                add(product, qty)
                setAdded(true)
                setQty(1)
                setTimeout(() => setAdded(false), 1500)
              }}
            >
              {added ? <><Check className="h-5 w-5" /> Added to cart</> : <><ShoppingBag className="h-5 w-5" /> {room === 0 && product.in_stock ? 'All available added' : 'Add to cart'}</>}
            </button>
          </div>
          {!product.in_stock && <p className="mt-4 text-sm text-cocoa-500">Want this on another day? Order ahead from the checkout page by choosing a later date.</p>}
          {inCart > 0 && <p className="mt-4 text-sm text-cocoa-500">You have {inCart} in your cart. <Link to="/cart" className="font-semibold text-berry-600">View cart</Link></p>}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cocoa-700 hover:text-berry-600">
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> Ask about this item on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
