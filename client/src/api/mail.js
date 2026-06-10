async function req(path, opts = {}, signal) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    signal,
    ...opts,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

export const auth = {
  login: (user, pass) => req('/auth/login', { method: 'POST', body: JSON.stringify({ user, pass }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  me: () => req('/auth/me'),
}

export const mail = {
  folders: (signal) => req('/api/folders', {}, signal),

  messages: (folder, page = 1, limit = 50, search = '', signal) =>
    req(`/api/messages?folder=${encodeURIComponent(folder)}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, {}, signal),

  message: (uid, folder, signal) =>
    req(`/api/messages/${uid}?folder=${encodeURIComponent(folder)}`, {}, signal),

  source: (uid, folder) =>
    fetch(`/api/messages/${uid}/source?folder=${encodeURIComponent(folder)}`, { credentials: 'include' })
      .then(r => r.text()),

  attachment: (uid, folder, index) =>
    `/api/messages/${uid}/attachment/${index}?folder=${encodeURIComponent(folder)}`,

  flags: (uid, folder, add = [], remove = []) =>
    req(`/api/messages/${uid}/flags?folder=${encodeURIComponent(folder)}`, {
      method: 'PATCH', body: JSON.stringify({ add, remove }),
    }),

  delete: (uid, folder) =>
    req(`/api/messages/${uid}?folder=${encodeURIComponent(folder)}`, { method: 'DELETE' }),

  move: (uid, folder, destination) =>
    req(`/api/messages/${uid}/move?folder=${encodeURIComponent(folder)}`, {
      method: 'POST', body: JSON.stringify({ destination }),
    }),

  send: (data, files = []) => {
    const fd = new FormData()
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null && v !== '') fd.append(k, v)
    }
    for (const file of files) fd.append('attachments', file)
    return fetch('/api/send', { method: 'POST', credentials: 'include', body: fd })
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
        return body
      })
  },

  draft: (data) => req('/api/draft', { method: 'POST', body: JSON.stringify(data) }),

  bulkFlags: (uids, folder, add = [], remove = []) =>
    req(`/api/bulk/flags?folder=${encodeURIComponent(folder)}`, {
      method: 'PATCH', body: JSON.stringify({ uids, add, remove }),
    }),

  bulkDelete: (uids, folder) =>
    req(`/api/bulk?folder=${encodeURIComponent(folder)}`, {
      method: 'DELETE', body: JSON.stringify({ uids }),
    }),

  emptyFolder: (folder) =>
    req(`/api/folders/empty?folder=${encodeURIComponent(folder)}`, { method: 'DELETE' }),
}
