import { useState } from 'react'
import api from '../api/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'register'>('register')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post(`/auth/${mode}`, { email, password })
      localStorage.setItem('jwt', data.access_token)
      location.href = '/passphrase'
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed')
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md ring-1 ring-black/5 anim-fade-in dark:border-neutral-800 dark:bg-neutral-900/80">
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-neutral-400">{mode === 'login' ? 'Sign in to continue' : 'It only takes a moment'}</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="Email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
          />
          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          <button
            className="w-full rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:opacity-100 active:anim-pulse-soft"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--app-text)' }}
            type="submit"
          >{mode === 'login' ? 'Login' : 'Register'}</button>
          <button
            className="login-secondary w-full rounded-md border px-3 py-2 text-sm shadow-sm transition"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: '#ffffff' }}
            type="button"
            onClick={()=>setMode(mode==='login'?'register':'login')}
          >{mode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}</button>
        </form>
      </div>
    </div>
  )
}
