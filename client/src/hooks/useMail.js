import { useState, useEffect, useCallback, useRef } from 'react'
import { mail } from '../api/mail'

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function useFolders() {
  const [folders, setFolders] = useState([])
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function load(attempt = 0) {
      try {
        const data = await mail.folders(controller.signal)
        if (!cancelled) { setFolders(data); setError(null) }
      } catch (e) {
        if (e.name === 'AbortError' || cancelled) return
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt)))
          if (!cancelled) load(attempt + 1)
        } else {
          if (!cancelled) setError(e.message)
        }
      }
    }

    load()
    return () => { cancelled = true; controller.abort() }
  }, [refreshKey])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])
  return { folders, error, refresh }
}

export function useMessages(folder, page, search, limit = 50) {
  const [data, setData] = useState({ messages: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const controllerRef = useRef(null)

  const load = useCallback((signal) => {
    if (!folder) return
    setLoading(true)
    setError(null)
    mail.messages(folder, page, limit, search, signal)
      .then(d => { if (!signal?.aborted) setData(d) })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => { if (!signal?.aborted) setLoading(false) })
  }, [folder, page, search, limit])

  useEffect(() => {
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()
    load(controllerRef.current.signal)

    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      controllerRef.current?.abort()
      controllerRef.current = new AbortController()
      load(controllerRef.current.signal)
    }, REFRESH_INTERVAL)

    return () => {
      controllerRef.current?.abort()
      clearInterval(interval)
    }
  }, [load])

  const refresh = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()
    load(controllerRef.current.signal)
  }, [load])

  return { ...data, loading, error, refresh }
}

export function useMessage(uid, folder) {
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!uid || !folder) { setMessage(null); return }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    mail.message(uid, folder, controller.signal)
      .then(setMessage)
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [uid, folder])

  return { message, loading, error }
}
