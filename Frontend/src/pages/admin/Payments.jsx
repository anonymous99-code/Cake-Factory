import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { PageHeader } from '../../components/AdminLayout'
import { EmptyState, ErrorBox, PageLoader, Stat } from '../../components/ui'
import { adminApi } from '../../lib/api'
import { formatDateTime, naira } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

const METHODS = { CASH: 'Cash', TRANSFER: 'Bank transfer', POS: 'POS / Card', ONLINE: 'Online', OTHER: 'Other' }

export default function Payments() {
  const [kind, setKind] = useState('')
  const { data, loading, error, reloadLoud } = useFetch(() => adminApi.get('/orders/payments/', { params: { kind } }).then((r) => r.data), [kind])
  const received = (data || []).filter((p) => p.kind === 'PAYMENT').reduce((s, p) => s + Number(p.amount), 0)
  const refunded = (data || []).filter((p) => p.kind === 'REFUND').reduce((s, p) => s + Number(p.amount), 0)

  return (
    <>
      <PageHeader title="Payments" subtitle="Every payment and refund recorded against an order. Record new ones from the Orders page." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={ArrowDownLeft} label="Received (shown)" value={naira(received)} tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={ArrowUpRight} label="Refunded (shown)" value={naira(refunded)} tone="bg-red-50 text-red-600" />
        <Stat icon={ArrowDownLeft} label="Net" value={naira(received - refunded)} />
      </div>
      <div className="mb-4 flex gap-2">
        {[['', 'All'], ['PAYMENT', 'Payments'], ['REFUND', 'Refunds']].map(([v, l]) => (
          <button key={v} onClick={() => setKind(v)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${kind === v ? 'bg-cocoa-900 text-white' : 'bg-white ring-1 ring-cocoa-200 hover:bg-cocoa-50'}`}>{l}</button>
        ))}
      </div>
      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reloadLoud} /> : !data.length ? (
        <EmptyState title="No payments recorded yet">When a customer pays, record it on their order and it will show here.</EmptyState>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-cocoa-50"><tr><th className="th">When</th><th className="th">Customer</th><th className="th">Type</th><th className="th">Method</th><th className="th">Reference</th><th className="th text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-cocoa-100">
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="td text-cocoa-500">{formatDateTime(p.created_at)}</td>
                    <td className="td font-semibold">{p.customer_name}</td>
                    <td className="td"><span className={`badge ${p.kind === 'REFUND' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>{p.kind === 'REFUND' ? 'Refund' : 'Payment'}</span></td>
                    <td className="td">{METHODS[p.method]}</td>
                    <td className="td font-mono text-xs text-cocoa-500">{p.reference || '—'}</td>
                    <td className={`td text-right font-semibold ${p.kind === 'REFUND' ? 'text-red-600' : ''}`}>{p.kind === 'REFUND' ? '−' : ''}{naira(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
