import { CalendarClock, Clock } from 'lucide-react'
import { useFeedback } from './feedback'
import { useCart } from '../context/CartContext'
import { useSettings } from '../context/SettingsContext'
import { formatDate, toDateInput } from '../lib/format'

/** "Today" or "Book for a later date": decides which day the customer is ordering for. */
export default function BookingDateBar() {
  const { bookingDate, setBookingDate, count } = useCart()
  const { settings } = useSettings()
  const { confirm } = useFeedback()

  const day = (offset) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return toDateInput(d)
  }
  const tomorrow = day(1)
  const furthest = day(settings.max_advance_days || 30)

  const change = async (next) => {
    if ((next || null) === (bookingDate || null)) return
    if (count > 0) {
      const ok = await confirm({
        title: 'Change the date?',
        message: 'What is available is different on each day, so your cart will be emptied.',
        confirmLabel: 'Change date',
        cancelLabel: 'Keep my cart',
      })
      if (!ok) return
    }
    setBookingDate(next)
  }

  const option = (active, onClick, Icon, title, text) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition ${active ? 'border-berry-500 bg-berry-50' : 'border-cocoa-200 bg-white hover:border-cocoa-300'}`}
    >
      <Icon className={`h-6 w-6 shrink-0 ${active ? 'text-berry-600' : 'text-cocoa-400'}`} />
      <span><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-cocoa-500">{text}</span></span>
    </button>
  )

  return (
    <div className="card space-y-3 !p-4">
      <p className="text-sm font-semibold">When do you need it?</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {option(!bookingDate, () => change(null), Clock, 'Today', 'What is fresh and in stock now')}
        {option(Boolean(bookingDate), () => change(bookingDate || tomorrow), CalendarClock, 'Book for a later date', 'Reserve ahead for a specific day')}
      </div>
      {bookingDate && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="booking-date" className="text-sm font-medium text-cocoa-700">Date</label>
          <input
            id="booking-date"
            type="date"
            className="input !w-auto"
            min={tomorrow}
            max={furthest}
            value={bookingDate}
            onChange={(e) => e.target.value && change(e.target.value)}
          />
          <span className="text-sm text-cocoa-500">Showing what is available on {formatDate(bookingDate, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      )}
    </div>
  )
}