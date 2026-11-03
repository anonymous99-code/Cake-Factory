import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react'
import { Field, Input, PageLoader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/api'

export default function Login() {
  const { user, checking, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (checking) return <PageLoader />
  if (user) return <Navigate to={location.state?.from || '/admin/dashboard'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(username.trim(), password)
      navigate(location.state?.from || '/admin/dashboard', { replace: true })
    } catch (err) {
      if (err.notStaff) setError('This account does not have permission to manage the business.')
      else if (err.response?.status === 401) setError('Incorrect username or password.')
      else setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-cocoa-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-berry-500/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-80 w-80 rounded-full bg-caramel-400/20 blur-3xl" />
        <p className="relative font-display text-2xl font-bold">🎂 Cake Factory</p>
        <div className="relative">
          <h1 className="font-display text-5xl font-bold leading-tight !text-white">Run the business,<br />one tap at a time.</h1>
          <p className="mt-4 max-w-sm text-cocoa-300">Orders, stock, catering requests and payments, all in one place.</p>
        </div>
        <p className="relative text-xs text-cocoa-400">Staff access only</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-berry-50 text-berry-600"><LockKeyhole className="h-7 w-7" /></span>
          <div>
            <h2 className="text-3xl font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-cocoa-500">Sign in to manage Cake Factory.</p>
          </div>
          <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required /></Field>
          <Field label="Password">
            <div className="relative">
              <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="pr-11" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-400 hover:text-cocoa-700" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </Field>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>}
          <button className="btn btn-primary btn-lg w-full" disabled={busy || !username || !password}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing in…</> : 'Sign in'}
          </button>
          <p className="text-center text-sm"><Link to="/" className="text-cocoa-500 hover:text-berry-600">← Back to the website</Link></p>
        </form>
      </div>
    </div>
  )
}
