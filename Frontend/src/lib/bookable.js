import { api } from './api'
import { toDateInput } from './format'


export async function fetchBookable(date) {
  const { data: products } = await api.get('/products/')
  if (!date || date <= toDateInput()) return products

  const { data: rows } = await api.get('/availability/', { params: { date } })
  const byProduct = new Map(rows.map((r) => [r.product, r]))
  return products
    .filter((p) => byProduct.has(p.id))
    .map((p) => {
      const row = byProduct.get(p.id)
      const quantity = row.status === 'SOLD_OUT' ? 0 : row.available_quantity
      return { ...p, available_quantity: quantity, in_stock: quantity > 0 }
    })
}