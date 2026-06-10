import { useState, useEffect, useCallback } from 'react'
import { auth } from '../api/mail'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.me()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, pass) => {
    const data = await auth.login(username, pass)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  return { user, loading, login, logout }
}
