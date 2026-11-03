export const naira = (value) => {
  const number = Number(value || 0)
  return '₦' + number.toLocaleString('en-NG', { minimumFractionDigits: number % 1 ? 2 : 0, maximumFractionDigits: 2 })
}

export const toDateInput = (date = new Date()) => {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  value ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-NG', options) : '—'

export const formatTime = (value) => {
  if (!value) return ''
  const [h, m] = value.split(':')
  const d = new Date()
  d.setHours(Number(h), Number(m))
  return d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
}

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '—'

export const CATEGORIES = [
  { value: 'SNACKS', label: 'Snacks', emoji: '🥧' },
  { value: 'CAKES', label: 'Cakes', emoji: '🎂' },
  { value: 'SMALL_CHOPS', label: 'Small chops', emoji: '🍢' },
  { value: 'OTHER', label: 'Other treats', emoji: '🍪' },
]
export const categoryEmoji = (value) => CATEGORIES.find((c) => c.value === value)?.emoji || '🍰'
export const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label || value

export const ORDER_STATUS = {
  PENDING: { label: 'Pending', tone: 'bg-amber-100 text-amber-800' },
  CONFIRMED: { label: 'Confirmed', tone: 'bg-sky-100 text-sky-800' },
  PREPARING: { label: 'Preparing', tone: 'bg-violet-100 text-violet-800' },
  READY: { label: 'Ready', tone: 'bg-emerald-100 text-emerald-800' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: 'Completed', tone: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-red-100 text-red-700' },
}

export const PAYMENT_STATUS = {
  UNPAID: { label: 'Unpaid', tone: 'bg-red-100 text-red-700' },
  PARTIAL: { label: 'Part paid', tone: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Paid', tone: 'bg-green-100 text-green-800' },
  REFUNDED: { label: 'Refunded', tone: 'bg-cocoa-100 text-cocoa-700' },
}

export const INQUIRY_STATUS = {
  NEW: { label: 'New', tone: 'bg-berry-100 text-berry-700' },
  CONTACTED: { label: 'Contacted', tone: 'bg-sky-100 text-sky-800' },
  QUOTATION_SENT: { label: 'Quotation sent', tone: 'bg-amber-100 text-amber-800' },
  ACCEPTED: { label: 'Accepted', tone: 'bg-green-100 text-green-800' },
  DECLINED: { label: 'Declined', tone: 'bg-cocoa-100 text-cocoa-600' },
}

export const BOOKING_STATUS = {
  CONFIRMED: { label: 'Confirmed', tone: 'bg-sky-100 text-sky-800' },
  IN_PROGRESS: { label: 'In progress', tone: 'bg-violet-100 text-violet-800' },
  COMPLETED: { label: 'Completed', tone: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-red-100 text-red-700' },
}

export const SERVICE_TYPES = [
  { value: 'CATERING', label: 'Catering only' },
  { value: 'EVENT_PLANNING', label: 'Event planning only' },
  { value: 'BOTH', label: 'Catering and event planning' },
]
export const serviceLabel = (v) => SERVICE_TYPES.find((s) => s.value === v)?.label || v

export function whatsappLink(number, message = '') {
  if (!number) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${text}`
}
