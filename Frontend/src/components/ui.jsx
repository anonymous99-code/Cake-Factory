import { useEffect } from 'react'
import { AlertCircle, Inbox, Loader2, Minus, Plus, X } from 'lucide-react'
import { categoryEmoji } from '../lib/format'

export const cx = (...parts) => parts.filter(Boolean).join(' ')

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={cx('animate-spin', className)} aria-hidden />
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-cocoa-500" role="status">
      <Spinner className="h-6 w-6 text-berry-500" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-red-50 px-6 py-10 text-center ring-1 ring-red-100" role="alert">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <p className="max-w-md text-sm text-red-800">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-cocoa-200 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-cocoa-100 text-cocoa-500">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      {children && <p className="max-w-sm text-sm text-cocoa-500">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Badge({ tone = 'bg-cocoa-100 text-cocoa-700', children, className }) {
  return <span className={cx('badge', tone, className)}>{children}</span>
}

export function StatusBadge({ map, value }) {
  const entry = map[value] || { label: value, tone: 'bg-cocoa-100 text-cocoa-700' }
  return <Badge tone={entry.tone}>{entry.label}</Badge>
}

export function Field({ label, error, hint, required, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label} {required && <span className="text-berry-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}

export function Input({ error, className, ...props }) {
  return <input className={cx('input', error && 'input-error', className)} {...props} />
}

export function Textarea({ error, className, rows = 3, ...props }) {
  return <textarea rows={rows} className={cx('input', error && 'input-error', className)} {...props} />
}

export function Select({ error, className, children, ...props }) {
  return (
    <select className={cx('input appearance-none bg-no-repeat pr-9', error && 'input-error', className)} {...props}>
      {children}
    </select>
  )
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useLockedScroll(open)
  useEscape(open, onClose)
  if (!open) return null
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size]
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-cocoa-900/50 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cx('flex max-h-[92vh] w-full animate-rise flex-col rounded-t-3xl bg-white shadow-soft sm:rounded-3xl', width)}
      >
        <div className="flex items-center justify-between gap-4 border-b border-cocoa-100 px-6 py-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-cocoa-500 hover:bg-cocoa-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-cocoa-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, title, subtitle, children }) {
  useLockedScroll(open)
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-cocoa-900/50 backdrop-blur-sm" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl animate-slide flex-col bg-cream shadow-soft"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cocoa-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-cocoa-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-cocoa-500 hover:bg-cocoa-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  )
}

export function QuantityStepper({ value, onChange, min = 0, max = 99, size = 'md' }) {
  const small = size === 'sm'
  const btn = cx(
    'grid place-items-center rounded-full bg-cocoa-100 text-cocoa-800 transition hover:bg-cocoa-200 disabled:opacity-40',
    small ? 'h-7 w-7' : 'h-9 w-9',
  )
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" />
      </button>
      <span className={cx('text-center font-semibold tabular-nums', small ? 'w-6 text-sm' : 'w-8')}>{value}</span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

const TILES = [
  'from-berry-100 to-caramel-100',
  'from-caramel-100 to-berry-50',
  'from-cocoa-100 to-caramel-100',
  'from-berry-50 to-cocoa-100',
]

/** Product photo, or a tasteful placeholder until the owner uploads one. */
export function ProductImage({ product, className, emojiClass = 'text-6xl' }) {
  if (product.image) {
    return <img src={product.image} alt={product.name} loading="lazy" className={cx('h-full w-full object-cover', className)} />
  }
  const tile = TILES[product.id % TILES.length]
  return (
    <div className={cx('grid h-full w-full place-items-center bg-gradient-to-br', tile, className)} aria-hidden>
      <span className={emojiClass}>{categoryEmoji(product.category)}</span>
    </div>
  )
}

export function Stat({ icon: Icon, label, value, hint, tone = 'bg-berry-50 text-berry-600' }) {
  return (
    <div className="card flex items-center gap-4">
      <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', tone)}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-cocoa-500">{label}</p>
        <p className="truncate font-display text-2xl font-semibold text-cocoa-900">{value}</p>
        {hint && <p className="truncate text-xs text-cocoa-500">{hint}</p>}
      </div>
    </div>
  )
}

function useLockedScroll(open) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])
}

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])
}
