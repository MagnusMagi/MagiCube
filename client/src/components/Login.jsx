import { useState } from 'react'

export function Login({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(user, pass)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center pt-[12vh] sm:items-center sm:pt-0 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">MagiCube</h1>
          <p className="text-zinc-500 text-sm mt-1">Webmail</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider" htmlFor="login-pass">Password</label>
            <div className="relative">
              <input
                id="login-pass"
                type={showPass ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPass ? (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                )}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg py-2.5 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
