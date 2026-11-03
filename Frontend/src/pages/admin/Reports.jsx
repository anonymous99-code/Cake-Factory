import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/AdminLayout'
import { useFeedback } from '../../components/feedback'
import { EmptyState, ErrorBox, Field, Input, PageLoader, Select } from '../../components/ui'
import { adminApi, errorMessage, fieldErrors } from '../../lib/api'
import { formatDate, naira, toDateInput } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

const CATEGORIES = { INGREDIENTS: 'Ingredients', PACKAGING: 'Packaging', TRANSPORT: 'Transport / delivery', UTILITIES: 'Gas, power and utilities', STAFF: 'Staff', OTHER: 'Other' }

export default function Reports() {
  const [days, setDays] = useState(30)
  const summary = useFetch(() => adminApi.get('/dashboard/summary/', { params: { days } }).then((r) => r.data), [days])
  const series = useFetch(() => adminApi.get('/dashboard/revenue/', { params: { days: Math.min(days, 31) } }).then((r) => r.data), [days])
  const expenses = useFetch(() => adminApi.get('/dashboard/expenses/').then((r) => r.data), [])
  const { toast, confirm } = useFeedback()
  const [form, setForm] = useState({ date: toDateInput(), category: 'INGREDIENTS', description: '', amount: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const addExpense = async (e) => {
    e.preventDefault()
    setBusy(true); setErrors({})
    try {
      await adminApi.post('/dashboard/expenses/', form)
      toast('Expense added')
      setForm((f) => ({ ...f, description: '', amount: '' }))
      expenses.reload(); summary.reload()
    } catch (err) { const fe = fieldErrors(err); setErrors(fe); if (!Object.keys(fe).length) toast(errorMessage(err), 'error') } finally { setBusy(false) }
  }

  const removeExpense = async (x) => {
    const ok = await confirm({ title: 'Delete this expense?', message: `${x.description} (${naira(x.amount)}) will be removed from your profit figures.`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try { await adminApi.delete(`/dashboard/expenses/${x.id}/`); toast('Expense deleted'); expenses.reload(); summary.reload() } catch (e) { toast(errorMessage(e), 'error') }
  }

  const m = summary.data?.money
  const rows = m && [
    ['Order value', m.order_value, 'Total of orders booked (not cancelled).'],
    ['Money received', m.amount_received, 'Payments recorded.'],
    ['Refunds', -m.refunds, 'Money paid back to customers.'],
    ['Net money received', m.net_received, 'Received minus refunds.'],
    ['Expenses', -m.expenses, 'Spending you entered below.'],
  ]

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales, money and expenses from your real records." actions={
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period" className="!w-44">
          {[7, 14, 30, 90, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}
        </Select>
      } />

      {summary.loading && !summary.data ? <PageLoader /> : summary.error ? <ErrorBox message={summary.error} onRetry={summary.reloadLoud} /> : (
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="card lg:col-span-2">
            <h2 className="mb-3 text-lg font-semibold">Money summary</h2>
            <dl className="divide-y divide-cocoa-100">
              {rows.map(([l, v, hint]) => (
                <div key={l} className="flex items-start justify-between gap-4 py-3">
                  <div><dt className="text-sm font-semibold">{l}</dt><dd className="text-xs text-cocoa-500">{hint}</dd></div>
                  <span className={`font-display text-lg font-semibold ${v < 0 ? 'text-red-600' : ''}`}>{v < 0 ? '−' : ''}{naira(Math.abs(v))}</span>
                </div>
              ))}
              <div className="flex items-start justify-between gap-4 py-3">
                <div><dt className="text-sm font-semibold">Estimated profit</dt><dd className="text-xs text-cocoa-500">Net received minus expenses. Orders only.</dd></div>
                <span className={`font-display text-xl font-bold ${m.estimated_profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{naira(m.estimated_profit)}</span>
              </div>
            </dl>
            <div className="mt-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Still owed on orders:</strong> {naira(m.outstanding_orders)}<br />
              <strong>Catering booked:</strong> {naira(m.catering_booked_value)} · received {naira(m.catering_received)} · owed {naira(m.catering_outstanding)}
            </div>
            <p className="mt-3 text-xs text-cocoa-500">Revenue is not profit. Profit is only as accurate as the expenses you enter.</p>
          </section>

          <section className="card lg:col-span-3">
            <h2 className="mb-4 text-lg font-semibold">Order value vs money received</h2>
            {series.loading ? <PageLoader /> : series.error ? <ErrorBox message={series.error} onRetry={series.reloadLoud} /> : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series.data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E0" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: '#96654F' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} tick={{ fontSize: 11, fill: '#96654F' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => naira(v)} labelFormatter={(d) => formatDate(d)} contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 40px -12px rgba(94,49,30,.3)' }} />
                    <Legend />
                    <Bar dataKey="order_value" name="Order value" fill="#F6BC4F" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="received" name="Money received" fill="#E8386B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {days > 31 && <p className="mt-2 text-xs text-cocoa-500">The chart shows the most recent 31 days.</p>}
          </section>
        </div>
      )}

      <section className="card mt-6">
        <h2 className="mb-1 text-lg font-semibold">Expenses</h2>
        <p className="mb-4 text-sm text-cocoa-500">Record what you spend on ingredients, gas, packaging and more so profit is realistic.</p>
        <form onSubmit={addExpense} className="grid gap-3 sm:grid-cols-[9rem_11rem_1fr_9rem_auto] sm:items-end">
          <Field label="Date" error={errors.date}><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.date} required /></Field>
          <Field label="Category"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="What was it for?" error={errors.description}><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} placeholder="Flour, 10 bags" required /></Field>
          <Field label="Amount (₦)" error={errors.amount}><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={errors.amount} required /></Field>
          <button className="btn btn-primary" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add</button>
        </form>

        <div className="mt-6">
          {expenses.loading && !expenses.data ? <PageLoader /> : expenses.error ? <ErrorBox message={expenses.error} onRetry={expenses.reloadLoud} /> : !expenses.data.length ? (
            <EmptyState title="No expenses recorded">Add your first expense above.</EmptyState>
          ) : (
            <ul className="divide-y divide-cocoa-100">
              {expenses.data.slice(0, 50).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div><p className="font-semibold">{x.description}</p><p className="text-xs text-cocoa-500">{formatDate(x.date)} · {CATEGORIES[x.category]}</p></div>
                  <div className="flex items-center gap-2"><span className="font-semibold">{naira(x.amount)}</span><button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => removeExpense(x)} aria-label={`Delete ${x.description}`}><Trash2 className="h-4 w-4" /></button></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
