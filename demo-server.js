'use strict'
const express = require('express')
const path = require('path')
const session = require('express-session')

const app = express()
const PORT = 8893

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
  secret: 'demo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}))

// ── Mock data ─────────────────────────────────────────────────────────────────

const FOLDERS = [
  { path: 'INBOX', name: 'INBOX', delimiter: '/', flags: [], status: { unseen: 4, messages: 12 } },
  { path: 'INBOX.Sent', name: 'Sent', delimiter: '/', flags: [], status: { unseen: 0, messages: 8 } },
  { path: 'INBOX.Drafts', name: 'Drafts', delimiter: '/', flags: [], status: { unseen: 0, messages: 2 } },
  { path: 'INBOX.Trash', name: 'Trash', delimiter: '/', flags: [], status: { unseen: 0, messages: 5 } },
  { path: 'INBOX.Spam', name: 'Spam', delimiter: '/', flags: [], status: { unseen: 1, messages: 3 } },
  { path: 'INBOX.Archive', name: 'Archive', delimiter: '/', flags: [], status: { unseen: 0, messages: 47 } },
  { path: 'INBOX.Work', name: 'Work', delimiter: '/', flags: [], status: { unseen: 2, messages: 19 } },
]

// Format matches real server.js /api/messages response shape:
// { uid, subject, from: {name, address}, date, read, starred }
const MESSAGES = [
  {
    uid: 1001,
    subject: 'Q3 Design Review — final assets attached',
    from: { name: 'Sarah Chen', address: 'sarah.chen@designco.io' },
    date: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    read: false,
    starred: false,
  },
  {
    uid: 1002,
    subject: 'Re: Infrastructure upgrade — Phase 2 timeline',
    from: { name: 'Ahmet Yılmaz', address: 'ahmet@devops.team' },
    date: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    read: false,
    starred: false,
  },
  {
    uid: 1003,
    subject: 'MagiCube v1.1 — release notes draft',
    from: { name: 'Claude', address: 'noreply@anthropic.com' },
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: false,
    starred: false,
  },
  {
    uid: 1004,
    subject: 'Invoice #INV-2026-089 — June Services',
    from: { name: 'Billing', address: 'billing@hetzner.com' },
    date: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    read: false,
    starred: false,
  },
  {
    uid: 1005,
    subject: 'Nakama game server — match replay feature spec',
    from: { name: 'Lena Fischer', address: 'lena@gamedev.studio' },
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    starred: false,
  },
  {
    uid: 1006,
    subject: 'Weekly digest — Hacker News top stories',
    from: { name: 'HN Digest', address: 'digest@hackernews.email' },
    date: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    read: true,
    starred: false,
  },
  {
    uid: 1007,
    subject: 'Server monitoring alert — CPU spike resolved',
    from: { name: 'Alertmanager', address: 'alerts@magnusmagi.com' },
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    read: true,
    starred: false,
  },
  {
    uid: 1008,
    subject: 'Partnership proposal — API integration',
    from: { name: 'Marco Ricci', address: 'marco@startupxyz.com' },
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    read: true,
    starred: true,
  },
]

// Format matches real server.js /api/messages/:uid response shape:
// { uid, subject, from: [{name,address}], to: [...], cc: [...], date, text, html, attachments }
const FULL_MESSAGE = {
  uid: 1001,
  messageId: '<q3-design-review@designco.io>',
  references: [],
  subject: 'Q3 Design Review — final assets attached',
  from: [{ name: 'Sarah Chen', address: 'sarah.chen@designco.io' }],
  to: [{ name: 'Magnus', address: 'magnus@magicube.app' }],
  cc: [],
  date: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  html: `<div style="font-family: system-ui, sans-serif; color: #e4e4e7; max-width: 600px; padding: 16px;">
    <p>Hi Magnus,</p>
    <p>Please find the <strong>final Q3 design assets</strong> attached to this message. Everything has been exported at 2× resolution in both light and dark variants.</p>
    <p>Checklist for the handoff:</p>
    <ul>
      <li>✅ Dashboard wireframes (Figma export)</li>
      <li>✅ Component library (Storybook snapshot)</li>
      <li>✅ Icon set (SVG, 24px grid)</li>
      <li>✅ Motion spec (timing + easing values)</li>
    </ul>
    <p>Let me know if any revisions are needed before Thursday's deadline. I'm available for a quick call tomorrow morning if that helps.</p>
    <p>Best,<br><strong>Sarah</strong><br><span style="color:#a1a1aa">Design Lead · DesignCo</span></p>
  </div>`,
  text: 'Hi Magnus, please find the final Q3 design assets attached...',
  attachments: [
    { filename: 'q3-dashboard-wireframes.fig', size: 4821304, contentType: 'application/octet-stream', index: 0 },
    { filename: 'component-library.zip', size: 12483920, contentType: 'application/zip', index: 1 },
    { filename: 'icons-24px.svg', size: 89234, contentType: 'image/svg+xml', index: 2 },
    { filename: 'motion-spec.pdf', size: 1204839, contentType: 'application/pdf', index: 3 },
  ],
  headers: {},
}

const SEARCH_RESULTS = [
  {
    uid: 1001, folder: 'INBOX',
    envelope: {
      date: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      subject: 'Q3 Design Review — final assets attached',
      from: [{ name: 'Sarah Chen', address: 'sarah.chen@designco.io' }],
    },
    preview: 'Hi Magnus, please find the final Q3 design assets attached...',
  },
  {
    uid: 1003, folder: 'INBOX',
    envelope: {
      date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      subject: 'MagiCube v1.1 — release notes draft',
      from: [{ name: 'Claude', address: 'noreply@anthropic.com' }],
    },
    preview: 'Here is the draft release notes for MagiCube v1.1...',
  },
]

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/auth/login', (req, res) => {
  req.session.user = req.body.user || 'demo@magicube.app'
  req.session.loggedIn = true
  res.json({ ok: true })
})

app.post('/auth/logout', (req, res) => {
  req.session.destroy()
  res.json({ ok: true })
})

app.get('/auth/me', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ user: req.session.user })
})

// Playwright uses this to skip the login form
app.get('/demo-login', (req, res) => {
  req.session.user = 'magnus@magicube.app'
  req.session.loggedIn = true
  res.redirect('/')
})

// ── Folders ───────────────────────────────────────────────────────────────────

app.get('/api/folders', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json(FOLDERS)
})

// ── Messages ──────────────────────────────────────────────────────────────────

app.get('/api/messages', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  const folder = req.query.folder || 'INBOX'
  const search = (req.query.search || '').toLowerCase()
  let msgs = MESSAGES
  if (search) msgs = msgs.filter(m =>
    m.subject.toLowerCase().includes(search) ||
    (m.from.name || '').toLowerCase().includes(search)
  )
  if (folder !== 'INBOX') msgs = []
  res.json({ messages: msgs, total: msgs.length, page: 1, limit: 50 })
})

app.get('/api/messages/:uid', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json(FULL_MESSAGE)
})

app.patch('/api/messages/:uid/flags', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.delete('/api/messages/:uid', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.post('/api/messages/:uid/move', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.patch('/api/bulk/flags', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.delete('/api/bulk', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

// ── Search ────────────────────────────────────────────────────────────────────

app.get('/api/search', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ results: SEARCH_RESULTS })
})

// ── Send / Draft / Queue ──────────────────────────────────────────────────────

app.post('/api/send', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.post('/api/draft', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.get('/api/queue', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json([
    { id: 'q1', to: 'partner@company.com', subject: 'Partnership follow-up', scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString() }
  ])
})

app.post('/api/queue', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true, id: 'q2' })
})

app.delete('/api/queue/:id', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

// ── Contacts ──────────────────────────────────────────────────────────────────

app.get('/api/contacts', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json([
    { id: 'c1', name: 'Sarah Chen', address: 'sarah.chen@designco.io' },
    { id: 'c2', name: 'Ahmet Yılmaz', address: 'ahmet@devops.team' },
    { id: 'c3', name: 'Lena Fischer', address: 'lena@gamedev.studio' },
    { id: 'c4', name: 'Marco Ricci', address: 'marco@startupxyz.com' },
  ])
})

app.post('/api/contacts', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.delete('/api/contacts/:id', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

// ── Labels ────────────────────────────────────────────────────────────────────

app.get('/api/label-defs', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json([
    { id: 'l1', name: 'Design', color: 'violet' },
    { id: 'l2', name: 'Infra', color: 'blue' },
    { id: 'l3', name: 'Billing', color: 'green' },
    { id: 'l4', name: 'Priority', color: 'red' },
  ])
})

app.put('/api/label-defs', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.get('/api/labels', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ 'INBOX:1001': ['l1'], 'INBOX:1002': ['l2'], 'INBOX:1004': ['l3'] })
})

app.patch('/api/messages/:uid/labels', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

// ── Templates ─────────────────────────────────────────────────────────────────

app.get('/api/templates', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json([
    { id: 't1', name: 'Meeting request', subject: 'Quick sync?', body: 'Hi,\n\nWould you be available for a 30-minute call this week?\n\nBest,' },
    { id: 't2', name: 'Invoice follow-up', subject: 'Re: Invoice {{number}}', body: 'Hi,\n\nJust following up on invoice {{number}}.\n\nThanks,' },
  ])
})

app.post('/api/templates', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true, id: 't3' })
})

app.delete('/api/templates/:id', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

// ── Settings ──────────────────────────────────────────────────────────────────

app.get('/api/vacation', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ enabled: false, subject: 'Out of office', body: 'I am currently out of office.', from: '', to: '' })
})

app.put('/api/vacation', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.get('/api/rules', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json([
    { id: 'r1', field: 'from', op: 'contains', value: 'billing@', action: 'move', actionValue: 'INBOX.Archive' },
    { id: 'r2', field: 'subject', op: 'starts-with', value: '[RESOLVED]', action: 'mark-read' },
  ])
})

app.put('/api/rules', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.get('/api/accounts', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json([{ index: 0, user: 'magnus@magicube.app', host: 'mail.magnusmagi.com', port: 993, active: true }])
})

app.post('/api/accounts', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.post('/api/accounts/:index/switch', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.delete('/api/accounts/:index', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

// ── Folder management ─────────────────────────────────────────────────────────

app.post('/api/folders', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.patch('/api/folders/rename', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.delete('/api/folders/empty', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

app.delete('/api/folders/:folderPath', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ ok: true })
})

// ── SSE (no-op for demo) ──────────────────────────────────────────────────────

app.get('/api/sse', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).end()
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  const counts = {}
  FOLDERS.forEach(f => { counts[f.path] = f.status.unseen })
  res.write(`data: ${JSON.stringify({ type: 'counts', counts })}\n\n`)
  req.on('close', () => res.end())
})

// ── Source / attachments (stubs) ──────────────────────────────────────────────

app.get('/api/messages/:uid/source', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).end()
  res.type('text/plain').send('From: sarah.chen@designco.io\nTo: magnus@magicube.app\nSubject: Q3 Design Review\n\nDemo raw source.')
})

app.get('/api/messages/:uid/attachment/:index', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).end()
  res.status(501).json({ error: 'Demo mode — no real attachments' })
})

app.get('/api/messages/:uid/attachments.zip', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).end()
  res.status(501).json({ error: 'Demo mode — no real attachments' })
})

// ── SPA fallback ──────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`MagiCube demo server → http://127.0.0.1:${PORT}`)
})
