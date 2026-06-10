'use strict';

const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const MailComposer = require('nodemailer/lib/mail-composer');
const nodemailer = require('nodemailer');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error('SESSION_SECRET env var is required');

const IMAP_HOST = process.env.IMAP_HOST || '172.30.1.250';
const IMAP_PORT = parseInt(process.env.IMAP_PORT) || 993;
const SMTP_HOST = process.env.SMTP_HOST || '172.30.1.253';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;

const SESSION_KEY = crypto.createHash('sha256').update(SESSION_SECRET).digest();

function encryptPass(pass) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SESSION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(pass, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptPass(enc) {
  const [ivHex, tagHex, dataHex] = enc.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', SESSION_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}

function validateHeaderField(val) {
  return typeof val === 'string' && !val.includes('\r') && !val.includes('\n');
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// ── IMAP pool ─────────────────────────────────────────────────────────────────

const pool = new Map();
const poolLastUsed = new Map();

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [sid, client] of pool) {
    if ((poolLastUsed.get(sid) || 0) < cutoff) {
      client.logout().catch(() => {});
      pool.delete(sid);
      poolLastUsed.delete(sid);
    }
  }
}, 10 * 60 * 1000).unref();

async function getImap(sid, user, pass) {
  let client = pool.get(sid);
  if (client?.authenticated) {
    poolLastUsed.set(sid, Date.now());
    return client;
  }
  if (client) {
    client.logout().catch(() => {});
    pool.delete(sid);
    poolLastUsed.delete(sid);
  }
  client = new ImapFlow({
    host: IMAP_HOST, port: IMAP_PORT, secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    logger: false,
  });
  client.on('close', () => { pool.delete(sid); poolLastUsed.delete(sid); });
  await client.connect();
  pool.set(sid, client);
  poolLastUsed.set(sid, Date.now());
  return client;
}

// ── Middleware ────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.session?.creds) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function getCreds(req) {
  const { user, encPass } = req.session.creds;
  return { user, pass: decryptPass(encPass) };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
});

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/auth/login', loginLimiter, async (req, res) => {
  const { user, pass } = req.body || {};
  if (!user || !pass) return res.status(400).json({ error: 'Missing credentials' });
  if (!validateHeaderField(user) || !validateHeaderField(pass))
    return res.status(400).json({ error: 'Invalid credentials format' });
  try {
    await getImap(req.session.id, user, pass);
    req.session.creds = { user, encPass: encryptPass(pass) };
    res.json({ ok: true, user });
  } catch (_) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

app.post('/auth/logout', async (req, res) => {
  const client = pool.get(req.session.id);
  if (client) { client.logout().catch(() => {}); pool.delete(req.session.id); poolLastUsed.delete(req.session.id); }
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/auth/me', requireAuth, (req, res) => res.json({ user: req.session.creds.user }));

// ── Folders (with unread counts) ──────────────────────────────────────────────

app.get('/api/folders', requireAuth, async (req, res) => {
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    const folders = await client.list();
    const result = [];
    for (const f of folders) {
      try {
        const st = await client.status(f.path, { unseen: true });
        result.push({ ...f, unseen: st.unseen || 0 });
      } catch (_) {
        result.push({ ...f, unseen: 0 });
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Empty folder (Trash / Spam only) ─────────────────────────────────────────

app.delete('/api/folders/empty', requireAuth, async (req, res) => {
  const folder = req.query.folder;
  if (!folder) return res.status(400).json({ error: 'Missing folder' });
  const label = folder.toLowerCase();
  if (!['trash', 'spam', 'junk', 'deleted'].some(k => label.includes(k)))
    return res.status(403).json({ error: 'Only Trash or Spam can be emptied' });
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    const uids = await client.search({ all: true }, { uid: true });
    if (uids.length) await client.messageDelete(uids, { uid: true });
    res.json({ ok: true, deleted: uids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk flags ────────────────────────────────────────────────────────────────

app.patch('/api/bulk/flags', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const { uids = [], add = [], remove = [] } = req.body || {};
  if (!uids.length) return res.status(400).json({ error: 'No UIDs' });
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    if (add.length) await client.messageFlagsAdd(uids, add, { uid: true });
    if (remove.length) await client.messageFlagsRemove(uids, remove, { uid: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk delete ───────────────────────────────────────────────────────────────

app.delete('/api/bulk', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const { uids = [] } = req.body || {};
  if (!uids.length) return res.status(400).json({ error: 'No UIDs' });
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    await client.messageDelete(uids, { uid: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Messages list ─────────────────────────────────────────────────────────────

app.get('/api/messages', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const search = req.query.search?.trim();
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    const query = search ? { or: [{ subject: search }, { from: search }] } : { all: true };
    const uids = await client.search(query, { uid: true });
    const total = uids.length;
    const pageUids = [...uids].reverse().slice((page - 1) * limit, page * limit);
    if (!pageUids.length) return res.json({ messages: [], total, page, limit });
    const messages = [];
    for await (const msg of client.fetch(pageUids, { uid: true, flags: true, envelope: true }, { uid: true })) {
      const from = msg.envelope.from?.[0];
      messages.push({
        uid: msg.uid,
        subject: msg.envelope.subject || '(No subject)',
        from: { name: from?.name || '', address: from?.address || '' },
        date: msg.envelope.date?.toISOString() || null,
        read: msg.flags.has('\\Seen'),
        starred: msg.flags.has('\\Flagged'),
      });
    }
    messages.sort((a, b) => b.uid - a.uid);
    res.json({ messages, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Single message ────────────────────────────────────────────────────────────

app.get('/api/messages/:uid', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const uid = parseInt(req.params.uid);
  if (!uid) return res.status(400).json({ error: 'Invalid UID' });
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    let source = null;
    for await (const msg of client.fetch([uid], { uid: true, source: true }, { uid: true })) {
      source = msg.source;
    }
    if (!source) return res.status(404).json({ error: 'Message not found' });
    client.messageFlagsAdd([uid], ['\\Seen'], { uid: true }).catch(() => {});
    const parsed = await simpleParser(source);
    res.json({
      uid,
      messageId: parsed.messageId || null,
      references: parsed.references || [],
      subject: parsed.subject || '(No subject)',
      from: parsed.from?.value || [],
      to: parsed.to?.value || [],
      cc: parsed.cc?.value || [],
      date: parsed.date?.toISOString() || null,
      text: parsed.text || '',
      html: parsed.html || null,
      attachments: (parsed.attachments || []).map((a, i) => ({
        index: i,
        filename: a.filename || 'attachment',
        contentType: a.contentType,
        size: a.size || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Raw source ────────────────────────────────────────────────────────────────

app.get('/api/messages/:uid/source', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const uid = parseInt(req.params.uid);
  if (!uid) return res.status(400).json({ error: 'Invalid UID' });
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    let source = null;
    for await (const msg of client.fetch([uid], { uid: true, source: true }, { uid: true })) {
      source = msg.source;
    }
    if (!source) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(source.toString('utf8'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Attachment download ───────────────────────────────────────────────────────

app.get('/api/messages/:uid/attachment/:index', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const uid = parseInt(req.params.uid);
  const idx = parseInt(req.params.index);
  if (!uid || isNaN(idx)) return res.status(400).json({ error: 'Invalid params' });
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    let source = null;
    for await (const msg of client.fetch([uid], { uid: true, source: true }, { uid: true })) {
      source = msg.source;
    }
    if (!source) return res.status(404).json({ error: 'Message not found' });
    const parsed = await simpleParser(source);
    const attachment = parsed.attachments?.[idx];
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    const filename = encodeURIComponent(attachment.filename || 'attachment');
    res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(attachment.content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Flags ─────────────────────────────────────────────────────────────────────

app.patch('/api/messages/:uid/flags', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const uid = parseInt(req.params.uid);
  const { add = [], remove = [] } = req.body || {};
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    if (add.length) await client.messageFlagsAdd([uid], add, { uid: true });
    if (remove.length) await client.messageFlagsRemove([uid], remove, { uid: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete ────────────────────────────────────────────────────────────────────

app.delete('/api/messages/:uid', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const uid = parseInt(req.params.uid);
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    await client.messageDelete([uid], { uid: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Move ──────────────────────────────────────────────────────────────────────

app.post('/api/messages/:uid/move', requireAuth, async (req, res) => {
  const folder = req.query.folder || 'INBOX';
  const uid = parseInt(req.params.uid);
  const { destination } = req.body || {};
  if (!destination) return res.status(400).json({ error: 'Missing destination' });
  try {
    const { user, pass } = getCreds(req);
    const client = await getImap(req.session.id, user, pass);
    await client.mailboxOpen(folder);
    await client.messageMove([uid], destination, { uid: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send (multipart/form-data with optional file attachments) ─────────────────

app.post('/api/send', requireAuth, upload.array('attachments'), async (req, res) => {
  const { to, cc, bcc, subject, text, inReplyTo, references } = req.body || {};
  if (!to || !subject) return res.status(400).json({ error: 'Missing required fields (to, subject)' });
  for (const [field, val] of [['to', to], ['cc', cc], ['bcc', bcc], ['subject', subject]]) {
    if (val !== undefined && !validateHeaderField(val))
      return res.status(400).json({ error: `Invalid value for field: ${field}` });
  }
  const { user, pass } = getCreds(req);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT, secure: false,
    auth: { user, pass }, tls: { rejectUnauthorized: false },
  });
  try {
    await transport.sendMail({
      from: user, to, cc: cc || undefined, bcc: bcc || undefined,
      subject, text,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
      attachments: (req.files || []).map(f => ({
        filename: f.originalname, content: f.buffer, contentType: f.mimetype,
      })),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Save draft ────────────────────────────────────────────────────────────────

app.post('/api/draft', requireAuth, async (req, res) => {
  const { to, cc, bcc, subject, text, folder = 'Drafts' } = req.body || {};
  const { user, pass } = getCreds(req);
  try {
    const mc = new MailComposer({
      from: user,
      to: to || '',
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject: subject || '',
      text: text || '',
    });
    const buf = await new Promise((resolve, reject) =>
      mc.compile().build((err, b) => err ? reject(err) : resolve(b))
    );
    const client = await getImap(req.session.id, user, pass);
    await client.append(folder, buf, ['\\Draft', '\\Seen']);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT) || 8891;
app.listen(PORT, '127.0.0.1', () =>
  console.log(`MagiCube listening on http://127.0.0.1:${PORT}`)
);
