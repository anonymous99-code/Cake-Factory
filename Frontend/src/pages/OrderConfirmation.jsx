import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, Circle, Copy, MessageCircle, PartyPopper, XCircle } from 'lucide-react'
import { ErrorBox, PageLoader, StatusBadge } from '../components/ui'
import { useFeedback } from '../components/feedback'
import { useSettings } from '../context/SettingsContext'
import { api } from '../lib/api'
import { formatDate, formatTime, naira, ORDER_STATUS, PAYMENT_STATUS, whatsappLink } from '../lib/format'
import { useFetch } from '../lib/useFetch'

const STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']

export default function OrderConfirmation() {
  const { orderNumber } = useParams()
  const location = useLocation()
  const { toast } = useFeedback()
  const { settings } = useSettings()
  const { data: order, loading, error, reload, reloadLoud } = useFetch(() => api.get(`/orders/track/${orderNumber}/`).then((r) => r.data), [orderNumber])

  useEffect(() => {
    const t = setInterval(reload, 30000)
    return () => clearInterval(t)
  }, [reload])

  if (loading) return <PageLoader label="Finding your order…" />
  if (error) {
    return (
      <div className="container-page max-w-xl py-16">
        <ErrorBox message="We could not find that order. Please check the link, or contact us." onRetry={reloadLoud} />
      </div>
    )
  }

  const shortRef = order.order_number.slice(0, 8).toUpperCase()
  const cancelled = order.status === 'CANCELLED'
  const delivery = order.fulfillment_method === 'DELIVERY'
  const steps = delivery ? [...STEPS.slice(0, 4), 'OUT_FOR_DELIVERY', 'COMPLETED'] : STEPS
  const currentIndex = steps.indexOf(order.status)
  const wa = whatsappLink(settings.whatsapp_number, `Hello! This is about my order ${shortRef} (${order.customer_name}).`)

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="card animate-rise text-center">
        {cancelled ? <XCircle className="mx-auto h-14 w-14 text-red-500" /> : location.state?.justPlaced ? <PartyPopper className="mx-auto h-14 w-14 text-berry-500" /> : <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />}
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          {cancelled ? 'This order was cancelled' : location.state?.justPlaced ? 'Thank you, your order is in!' : 'Your order'}
        </h1>
        {!cancelled && location.state?.justPlaced && (
          <p className="mx-auto mt-2 max-w-md text-sm text-cocoa-500">We have received your order and will confirm it shortly. Keep this page — it updates as we work on your order.</p>
        )}
        <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-cocoa-50 px-4 py-2 text-sm">
          <span className="text-cocoa-500">Reference</span>
          <span className="font-mono font-bold tracking-wider">{shortRef}</span>
          <button
            className="text-cocoa-400 hover:text-berry-600"
            aria-label="Copy page link"
            onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Order link copied') }}
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!cancelled && (
        <div className="card mt-6">
          <ol className="flex items-start justify-between gap-1 overflow-x-auto">
            {steps.map((s, i) => {
              const done = i <= currentIndex
              return (
                <li key={s} className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-2 text-center">
                  {done ? <CheckCircle2 className="h-7 w-7 text-berry-500" /> : <Circle className="h-7 w-7 text-cocoa-200" />}
                  <span className={`text-xs font-semibold ${done ? 'text-cocoa-900' : 'text-cocoa-400'}`}>{s === 'READY' && delivery ? 'Ready' : ORDER_STATUS[s].label}</span>
                </li>
              )
            })}
          </ol>
          {order.status === 'PENDING' && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-center text-xs text-amber-800">Waiting for confirmation. We will contact you if we need anything.</p>}
        </div>
      )}

      <div className="card mt-6 space-y-5">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cocoa-500">{delivery ? 'Delivery' : 'Pickup'}</p>
            <p className="mt-1 font-semibold">{formatDate(order.fulfillment_date)} {order.fulfillment_time && `· ${formatTime(order.fulfillment_time)}`}</p>
            {delivery && <p className="text-cocoa-500">{order.delivery_address}</p>}
          </div>
          <div className="flex flex-wrap items-start gap-2 sm:justify-end">
            <StatusBadge map={ORDER_STATUS} value={order.status} />
            <StatusBadge map={PAYMENT_STATUS} value={order.payment_status} />
          </div>
        </div>

        <ul className="divide-y divide-cocoa-100 border-y border-cocoa-100">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>{i.quantity} × {i.product_name}</span>
              <span className="font-semibold">{naira(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-cocoa-500">Subtotal</span><span>{naira(order.subtotal)}</span></div>
          {Number(order.delivery_fee) > 0 && <div className="flex justify-between"><span className="text-cocoa-500">Delivery</span><span>{naira(order.delivery_fee)}</span></div>}
          <div className="flex justify-between font-display text-xl font-semibold"><span>Total</span><span>{naira(order.total_amount)}</span></div>
          {Number(order.amount_paid) > 0 && <div className="flex justify-between text-emerald-700"><span>Paid so far</span><span>{naira(order.amount_paid)}</span></div>}
          {!cancelled && Number(order.balance_due) > 0 && <div className="flex justify-between font-semibold"><span>Balance to pay</span><span>{naira(order.balance_due)}</span></div>}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-dark"><MessageCircle className="h-4 w-4" /> Message us about this order</a>}
        <Link to="/menu" className="btn btn-secondary">Order something else</Link>
      </div>
    </div>
  )
}
