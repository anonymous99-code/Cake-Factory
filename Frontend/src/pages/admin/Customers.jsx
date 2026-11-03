import { useState } from 'react'
import { MessageCircle, Phone, Search } from 'lucide-react'
import { PageHeader } from '../../components/AdminLayout'
import { EmptyState, ErrorBox, Input, PageLoader } from '../../components/ui'
import { adminApi } from '../../lib/api'
import { formatDate, naira, whatsappLink } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

export default function Customers() {
  const [q, setQ] = useState('')
  const { data, loading, error, reloadLoud } = useFetch(() => adminApi.get('/dashboard/customers/', { params: { q } }).then((r) => r.data), [q])

  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who has ordered, grouped by phone number." />
      <div className="relative mb-6 max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" /><Input className="pl-10" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reloadLoud} /> : !data.length ? (
        <EmptyState title="No customers yet">Customers appear automatically once they place an order.</EmptyState>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-cocoa-50"><tr><th className="th">Customer</th><th className="th">Orders</th><th className="th">Total spent</th><th className="th">Last order</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-cocoa-100">
                {data.map((c) => {
                  const wa = whatsappLink(c.phone.replace(/\D/g, '').replace(/^0/, '234'), `Hello ${c.name}! `)
                  return (
                    <tr key={c.phone} className="hover:bg-cream">
                      <td className="td"><p className="font-semibold">{c.name}</p><p className="flex items-center gap-1 text-xs text-cocoa-500"><Phone className="h-3 w-3" />{c.phone}</p></td>
                      <td className="td">{c.orders}{c.cancelled > 0 && <span className="text-xs text-cocoa-400"> (+{c.cancelled} cancelled)</span>}</td>
                      <td className="td font-semibold">{naira(c.total_spent)}</td>
                      <td className="td text-cocoa-500">{formatDate(c.last_order)}</td>
                      <td className="td text-right">{wa && <a href={wa} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" aria-label={`WhatsApp ${c.name}`}><MessageCircle className="h-4 w-4 text-[#25D366]" /></a>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
