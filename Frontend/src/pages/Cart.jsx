import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react'
import BookingDateBar from '../components/BookingDateBar'
import { EmptyState, ProductImage, QuantityStepper } from '../components/ui'
import { useCart } from '../context/CartContext'
import { fetchBookable } from '../lib/bookable'
import { formatDate, naira } from '../lib/format'

export default function Cart() {
  const { lines, subtotal, setQuantity, remove, sync, count, bookingDate } = useCart()

  useEffect(() => {
    if (!count) return
    fetchBookable(bookingDate).then(sync).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!lines.length) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Link to="/menu" className="btn btn-primary">Browse the menu</Link>}>
          Add something delicious and it will show up here.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="container-page py-10">
      <h1 className="section-title">Your cart</h1>
      <div className="mt-4 max-w-3xl"><BookingDateBar /></div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-4">
          {lines.map(({ product, quantity }) => (
            <li key={product.id} className="card flex gap-4 !p-4">
              <Link to={`/menu/${product.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28">
                <ProductImage product={product} emojiClass="text-4xl" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/menu/${product.id}`} className="font-display text-lg font-semibold hover:text-berry-600">{product.name}</Link>
                  <button onClick={() => remove(product.id)} className="rounded-full p-2 text-cocoa-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${product.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-cocoa-500">{naira(product.price)} each</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <QuantityStepper size="sm" value={quantity} min={0} max={product.available_quantity} onChange={(v) => setQuantity(product.id, v)} />
                  <p className="font-display text-lg font-semibold">{naira(Number(product.price) * quantity)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-4 lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold">Summary</h2>
          <div className="flex justify-between text-sm"><span className="text-cocoa-500">Subtotal</span><span className="font-semibold">{naira(subtotal)}</span></div>
          <p className="text-xs text-cocoa-500">{bookingDate ? `Booking for ${formatDate(bookingDate)}. ` : ''}Delivery fee (if you choose delivery) is added at checkout.</p>
          <div className="flex justify-between border-t border-cocoa-100 pt-4 font-display text-xl font-semibold"><span>Total</span><span>{naira(subtotal)}</span></div>
          <Link to="/checkout" className="btn btn-primary btn-lg w-full">Checkout <ArrowRight className="h-5 w-5" /></Link>
          <Link to="/menu" className="btn btn-ghost w-full">Keep shopping</Link>
        </aside>
      </div>
    </div>
  )
}