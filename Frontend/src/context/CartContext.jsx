import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { toDateInput } from '../lib/format'

const KEY = 'cakefactory-cart-v1'
const DATE_KEY = 'cakefactory-booking-date-v1'
const CartContext = createContext(null)

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// A saved booking date that has already passed is ignored.
function loadDate() {
  try {
    const saved = localStorage.getItem(DATE_KEY)
    return saved && saved > toDateInput() ? saved : null
  } catch {
    return null
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load)
  const [bookingDate, setBookingDateState] = useState(loadDate)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)) } catch { /* private mode */ }
  }, [lines])

  useEffect(() => {
    try {
      if (bookingDate) localStorage.setItem(DATE_KEY, bookingDate)
      else localStorage.removeItem(DATE_KEY)
    } catch { /* private mode */ }
  }, [bookingDate])

  const value = useMemo(() => {
    const max = (p) => Math.max(0, p.available_quantity ?? 0)
    return {
      lines,
      bookingDate, // null means "today"
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + Number(l.product.price) * l.quantity, 0),
      // Availability differs by day, so changing the date empties the cart.
      setBookingDate(date) {
        const next = date && date > toDateInput() ? date : null
        if (next === bookingDate) return
        setBookingDateState(next)
        setLines([])
      },
      add(product, quantity = 1) {
        setLines((current) => {
          const existing = current.find((l) => l.product.id === product.id)
          if (existing) {
            return current.map((l) =>
              l.product.id === product.id ? { ...l, product, quantity: Math.min(l.quantity + quantity, max(product)) } : l,
            )
          }
          return [...current, { product, quantity: Math.min(quantity, max(product)) }]
        })
      },
      setQuantity(productId, quantity) {
        setLines((current) =>
          current
            .map((l) => (l.product.id === productId ? { ...l, quantity: Math.min(quantity, max(l.product)) } : l))
            .filter((l) => l.quantity > 0),
        )
      },
      remove(productId) {
        setLines((current) => current.filter((l) => l.product.id !== productId))
      },
      // Refresh prices and stock from the server so the cart is never stale.
      sync(products) {
        const byId = new Map(products.map((p) => [p.id, p]))
        setLines((current) =>
          current
            .filter((l) => byId.has(l.product.id))
            .map((l) => {
              const fresh = byId.get(l.product.id)
              return { product: fresh, quantity: Math.min(l.quantity, Math.max(0, fresh.available_quantity)) }
            })
            .filter((l) => l.quantity > 0),
        )
      },
      clear() { setLines([]) },
    }
  }, [lines, bookingDate])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)