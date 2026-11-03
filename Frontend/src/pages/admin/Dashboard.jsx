import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Banknote, CalendarCheck, ChefHat, ClipboardList, Clock, HandCoins, PackageCheck, Truck, Undo2 } from 'lucide-react'
import { PageHeader } from '../../components/AdminLayout'
import { EmptyState, ErrorBox, PageLoader, Stat, StatusBadge } from '../../components/ui'
import { adminApi } from '../../lib/api'
import { formatDate, formatDateTime, naira, ORDER_STATUS, PAYMENT_STATUS } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'
import { useAuth } from '../../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const summary = useFetch(() => adminApi.get('/dashboard/summary/', { params: { days: 30 } }).then((r) => r.data), [])
  const revenue = useFetch(() => adminApi.get('/dashboard/revenue/', { params: { days: 14 } }).then((r) => r.data), [])

  if (summary.loading) return <PageLoader />
  if (summary.error) return <ErrorBox message={summary.error} onRetry={summary.reloadLoud} />

  const { orders, money, products, catering, recent_orders: recent } = summary.data
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <PageHeader title={`${greeting}, ${user.first_name || user.username}`} subtitle="Here is how the business is doing." />

      {(orders.pending > 0 || catering.new_inquiries > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {orders.pending > 0 && (
            <Link to="/admin/orders" className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200">
              <Clock className="h-4 w-4" /> {orders.pending} order{orders.pending > 1 ? 's' : ''} waiting for confirmation
            </Link>
          )}
          {catering.new_inquiries > 0 && (
            <Link to="/admin/catering" className="flex items-center gap-2 rounded-full bg-berry-100 px-4 py-2 text-sm font-semibold text-berry-800 hover:bg-berry-200">
              <ChefHat className="h-4 w-4" /> {catering.new_inquiries} new catering / event inquir{catering.new_inquiries > 1 ? 'ies' : 'y'}
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={ClipboardList} label="Orders today" value={orders.received_today} hint={`${orders.total} all time`} />
        <Stat icon={CalendarCheck} label="Due today" value={orders.due_today} hint="To prepare or hand over" tone="bg-sky-50 text-sky-600" />
        <Stat icon={PackageCheck} label="In the kitchen" value={orders.confirmed + orders.preparing} hint={`${orders.confirmed} confirmed · ${orders.preparing} preparing`} tone="bg-violet-50 text-violet-600" />
        <Stat icon={Truck} label="Completed" value={orders.completed} tone="bg-emerald-50 text-emerald-600" />
      </div>

      <h2 className="mb-3 mt-10 text-xl font-semibold">Money · last {money.period_days} days</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Banknote} label="Money received" value={naira(money.net_received)} hint={`${naira(money.amount_received)} in, ${naira(money.refunds)} refunded`} tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={ClipboardList} label="Order value" value={naira(money.order_value)} hint="Sales booked (not the same as paid)" tone="bg-sky-50 text-sky-600" />
        <Stat icon={HandCoins} label="Still owed" value={naira(money.outstanding_orders)} hint="Unpaid balance on open orders" tone="bg-amber-50 text-amber-600" />
        <Stat icon={Undo2} label="Estimated profit" value={naira(money.estimated_profit)} hint={`After ${naira(money.expenses)} expenses`} />
      </div>
      <p className="mt-2 text-xs text-cocoa-500">Profit only counts orders and the expenses you have entered under Reports.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Money received · last 14 days</h2>
          {revenue.loading ? <PageLoader /> : revenue.error ? <ErrorBox message={revenue.error} onRetry={revenue.reloadLoud} /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue.data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E8386B" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#E8386B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E0" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: '#96654F' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} tick={{ fontSize: 11, fill: '#96654F' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => naira(v)} labelFormatter={(d) => formatDate(d)} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px -12px rgba(94,49,30,.3)' }} />
                  <Area type="monotone" dataKey="received" name="Received" stroke="#E8386B" strokeWidth={3} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Low stock</h2>
            <Link to="/admin/products" className="text-sm font-semibold text-berry-600">Manage</Link>
          </div>
          {products.low_stock.length ? (
            <ul className="divide-y divide-cocoa-100">
              {products.low_stock.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className={`badge ${p.available_quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                    {p.available_quantity === 0 ? 'Sold out' : `${p.available_quantity} left`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-cocoa-500">Stock levels look healthy.</p>
          )}
          <p className="mt-3 text-xs text-cocoa-500">{products.available} products available · {products.sold_out} sold out</p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm font-semibold text-berry-600">View all</Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-cocoa-100">
              {recent.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{o.customer_name}</p>
                    <p className="text-xs text-cocoa-500">{formatDateTime(o.created_at)} · {o.items.length} item{o.items.length > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge map={ORDER_STATUS} value={o.status} />
                    <StatusBadge map={PAYMENT_STATUS} value={o.payment_status} />
                    <span className="w-20 text-right font-semibold">{naira(o.total_amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No orders yet">Orders from the website will appear here.</EmptyState>}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Catering &amp; events</h2>
            <Link to="/admin/catering" className="text-sm font-semibold text-berry-600">Open</Link>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-berry-50 p-3"><p className="font-display text-2xl font-semibold">{catering.open_inquiries}</p><p className="text-xs text-cocoa-600">Open inquiries</p></div>
            <div className="rounded-2xl bg-emerald-50 p-3"><p className="font-display text-2xl font-semibold">{catering.confirmed_bookings}</p><p className="text-xs text-cocoa-600">Bookings</p></div>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cocoa-500">Upcoming events</p>
          {catering.upcoming_bookings.length ? (
            <ul className="space-y-2 text-sm">
              {catering.upcoming_bookings.map((b) => (
                <li key={b.id} className="rounded-2xl bg-cocoa-50 p-3">
                  <p className="font-semibold">{b.event_type} · {b.customer_name}</p>
                  <p className="text-xs text-cocoa-500">{formatDate(b.event_date)} · balance {naira(b.outstanding_balance)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-cocoa-500">No confirmed events coming up.</p>}
          {money.catering_outstanding > 0 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> {naira(money.catering_outstanding)} still owed on bookings</p>
          )}
        </section>
      </div>
    </>
  )
}
