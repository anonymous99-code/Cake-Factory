import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { adminApi, api, tokens } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(Boolean(tokens.access))

  const logout = useCallback(() => {
    tokens.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    if (!tokens.access) return
    adminApi
      .get('/auth/me/')
      .then(({ data }) => (data.is_staff ? setUser(data) : logout()))
      .catch(() => logout())
      .finally(() => setChecking(false))
  }, [logout])

  useEffect(() => {
    window.addEventListener('cf:logout', logout)
    return () => window.removeEventListener('cf:logout', logout)
  }, [logout])

  const login = async (username, password) => {
    const { data } = await api.post('/auth/token/', { username, password })
    tokens.set(data)
    try {
      const me = await adminApi.get('/auth/me/')
      if (!me.data.is_staff) {
        tokens.clear()
        throw Object.assign(new Error('not staff'), { notStaff: true })
      }
      setUser(me.data)
    } catch (e) {
      tokens.clear()
      throw e
    }
  }

  return <AuthContext.Provider value={{ user, checking, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
