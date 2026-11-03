import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const defaults = {
  business_name: 'Cake Factory',
  tagline: 'Freshly made snacks, cakes and catering',
  whatsapp_number: '',
  phone_number: '',
  email: '',
  address: '',
  google_maps_url: '',
  opening_hours: '',
  accepts_orders: true,
  delivery_enabled: true,
  delivery_fee: '0',
  free_delivery_threshold: null,
  delivery_policy: '',
  max_advance_days: 30,
}

const SettingsContext = createContext({ settings: defaults, loaded: false, refresh: () => {} })

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults)
  const [loaded, setLoaded] = useState(false)

  const refresh = () =>
    api
      .get('/settings/')
      .then(({ data }) => setSettings({ ...defaults, ...data }))
      .catch(() => {})
      .finally(() => setLoaded(true))

  useEffect(() => { refresh() }, [])

  return <SettingsContext.Provider value={{ settings, loaded, refresh }}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
