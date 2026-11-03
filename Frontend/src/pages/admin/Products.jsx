import { useRef, useState } from 'react'
import { EyeOff, ImagePlus, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/AdminLayout'
import { useFeedback } from '../../components/feedback'
import { Badge, EmptyState, ErrorBox, Field, Input, Modal, PageLoader, ProductImage, Select, Textarea } from '../../components/ui'
import { adminApi, errorMessage, fieldErrors } from '../../lib/api'
import { CATEGORIES, categoryLabel, naira } from '../../lib/format'
import { useFetch } from '../../lib/useFetch'

const blank = { name: '', description: '', category: 'SNACKS', price: '', available_quantity: 0, estimated_preparation_minutes: 30, is_available: true, is_active: true }

export default function Products() {
  const { data, loading, error, reload, reloadLoud } = useFetch(() => adminApi.get('/products/').then((r) => r.data), [])
  const { toast, confirm } = useFeedback()
  const [editing, setEditing] = useState(null)
  const [q, setQ] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const list = (data || []).filter((p) => (showHidden || p.is_active) && (!q || p.name.toLowerCase().includes(q.toLowerCase())))

  const patch = async (p, body, message) => {
    try {
      await adminApi.patch(`/products/${p.id}/`, body)
      toast(message)
      reload()
    } catch (e) { toast(errorMessage(e), 'error') }
  }

  const hide = async (p) => {
    const ok = await confirm({ title: `Remove ${p.name}?`, message: 'It disappears from the shop but stays in past orders and reports. You can restore it later.', confirmLabel: 'Remove', danger: true })
    if (ok) {
      try { await adminApi.delete(`/products/${p.id}/`); toast('Product removed from the shop'); reload() } catch (e) { toast(errorMessage(e), 'error') }
    }
  }

  return (
    <>
      <PageHeader title="Products" subtitle="Your menu, prices and today's stock." actions={<button className="btn btn-primary" onClick={() => setEditing(blank)}><Plus className="h-4 w-4" /> Add product</button>} />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-400" />
          <Input className="pl-10" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-cocoa-600">
          <input type="checkbox" className="h-4 w-4 rounded border-cocoa-300 text-berry-500 focus:ring-berry-400" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} /> Show removed products
        </label>
      </div>

      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reloadLoud} /> : !list.length ? (
        <EmptyState title="No products yet" action={<button className="btn btn-primary" onClick={() => setEditing(blank)}>Add your first product</button>}>Add the snacks and cakes you sell so customers can order them.</EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <div key={p.id} className={`card flex flex-col !p-0 overflow-hidden ${!p.is_active ? 'opacity-60' : ''}`}>
              <div className="relative aspect-[16/9] bg-cocoa-50">
                <ProductImage product={p} emojiClass="text-5xl" />
                <div className="absolute left-3 top-3 flex gap-2">
                  {!p.is_active && <Badge tone="bg-cocoa-900 text-white"><EyeOff className="h-3 w-3" /> Removed</Badge>}
                  {p.is_active && !p.is_available && <Badge tone="bg-amber-100 text-amber-800">Hidden from shop</Badge>}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-berry-500">{categoryLabel(p.category)}</p>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                  </div>
                  <p className="font-display text-lg font-semibold">{naira(p.price)}</p>
                </div>
                <StockEditor product={p} onSave={(qty) => patch(p, { available_quantity: qty }, 'Stock updated')} />
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-cocoa-100 pt-3">
                  {p.is_active ? (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <button
                        role="switch" aria-checked={p.is_available}
                        onClick={() => patch(p, { is_available: !p.is_available }, p.is_available ? 'Hidden from the shop' : 'Now showing in the shop')}
                        className={`relative h-6 w-11 rounded-full transition ${p.is_available ? 'bg-emerald-500' : 'bg-cocoa-300'}`}
                      ><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${p.is_available ? 'left-[22px]' : 'left-0.5'}`} /></button>
                      On sale
                    </label>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => patch(p, { is_active: true }, 'Product restored')}>Restore</button>
                  )}
                  <div className="flex gap-1">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /> Edit</button>
                    {p.is_active && <button className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={() => hide(p)} aria-label={`Remove ${p.name}`}><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <ProductModal product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}

function StockEditor({ product, onSave }) {
  const [value, setValue] = useState(String(product.available_quantity))
  const dirty = Number(value) !== product.available_quantity
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-cocoa-50 p-2">
      <span className="pl-2 text-xs font-semibold uppercase tracking-wide text-cocoa-500">Stock today</span>
      <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="input !w-20 !py-1.5 text-center" aria-label={`Stock for ${product.name}`} />
      {dirty && <button className="btn btn-primary btn-sm" onClick={() => onSave(Math.max(0, Number(value) || 0))}>Save</button>}
      {!dirty && product.available_quantity === 0 && <Badge tone="bg-red-100 text-red-700">Sold out</Badge>}
    </div>
  )
}

function ProductModal({ product, onClose, onSaved }) {
  const { toast } = useFeedback()
  const [form, setForm] = useState({ ...blank, ...product })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(product.image || '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const input = useRef()
  const isNew = !product.id
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setErrors({ image: 'Image must be 5 MB or smaller.' }); return }
    setErrors({})
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const save = async () => {
    const v = {}
    if (!form.name.trim()) v.name = 'Give the product a name.'
    if (!Number(form.price) || Number(form.price) <= 0) v.price = 'Enter a price above zero.'
    setErrors(v)
    if (Object.keys(v).length) return

    const body = new FormData()
    ;['name', 'description', 'category', 'price', 'available_quantity', 'estimated_preparation_minutes'].forEach((k) => body.append(k, form[k] ?? ''))
    body.append('is_available', form.is_available)
    body.append('is_active', form.is_active)
    if (file) body.append('image', file)

    setBusy(true)
    try {
      if (isNew) await adminApi.post('/products/', body)
      else await adminApi.patch(`/products/${product.id}/`, body)
      toast(isNew ? 'Product added' : 'Product saved')
      onSaved()
    } catch (e) {
      setErrors(fieldErrors(e))
      toast(errorMessage(e), 'error')
    } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Add product' : 'Edit product'} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save product</button></>}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-cocoa-50">{preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ProductImage product={{ ...form, id: 0 }} emojiClass="text-4xl" />}</div>
          <div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" /> {preview ? 'Change photo' : 'Upload photo'}</button>
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
            <p className="hint">JPG or PNG, up to 5 MB.</p>
            {errors.image && <p className="mt-1 text-xs font-medium text-red-600">{errors.image}</p>}
          </div>
        </div>
        <Field label="Name" required error={errors.name}><Input value={form.name} onChange={set('name')} error={errors.name} /></Field>
        <Field label="Description" error={errors.description}><Textarea value={form.description} onChange={set('description')} placeholder="What is it? What makes it special?" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category"><Select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
          <Field label="Price (₦)" required error={errors.price}><Input type="number" min="0" inputMode="decimal" value={form.price} onChange={set('price')} error={errors.price} /></Field>
          <Field label="Stock available today" error={errors.available_quantity}><Input type="number" min="0" value={form.available_quantity} onChange={set('available_quantity')} /></Field>
          <Field label="Preparation time (minutes)" error={errors.estimated_preparation_minutes}><Input type="number" min="0" value={form.estimated_preparation_minutes} onChange={set('estimated_preparation_minutes')} /></Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 rounded border-cocoa-300 text-berry-500 focus:ring-berry-400" checked={form.is_available} onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))} />
          Show this product in the shop
        </label>
      </div>
    </Modal>
  )
}
