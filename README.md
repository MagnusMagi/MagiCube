# MagiCube

A self-hosted, privacy-first webmail client built with React 19, Express, and real IMAP/SMTP — no third-party mail services, no tracking, no data leaving your server.

Live at **[magicube.magnusmagi.com](https://magicube.magnusmagi.com)**

---

## Overview

MagiCube is a full-stack webmail client designed to be deployed alongside [Mailcow](https://mailcow.email/) or any standard IMAP/SMTP server. It provides a fast, keyboard-driven interface with a dark zinc UI, animated micro-interactions, and a rich compose experience — all in a single Node.js process.

```
Browser  ←──HTTPS──→  Express (server.js)  ←──IMAP/SMTP──→  Mailcow / Mail Server
                            │
                        Session Auth
                        AES-256-GCM
                        Rate Limiting
```

---

## Features

### Mail Reading
- **IMAP folder tree** — all mailboxes listed in the sidebar with unread counts
- **Thread grouping** — toggle between flat list and conversation threads (grouped by normalized subject, strips Re:/Fwd: chains)
- **Full-text search** — per-folder IMAP search with 400 ms debounce
- **HTML + plain text rendering** — automatic fallback, sanitized iframe rendering for HTML bodies
- **External image blocking** — remote images hidden by default with a "Show images" reveal button
- **Auto-mark as read** — configurable; marks the active message on open
- **Contact harvesting** — From/To/Cc addresses auto-saved to localStorage for autocomplete (rolling 200-contact window)
- **PDF & image attachment preview** — inline image lightbox, PDF icon with direct download link
- **Raw source view** — toggle original MIME source for debugging
- **Keyboard navigation** — `j/k` or `↓/↑` to move between messages without touching the mouse
- **Bulk operations** — checkbox-select multiple messages, bulk mark read/unread, bulk delete

### Compose
- **Rich text editor** — `contentEditable`-based with full formatting toolbar:
  - **Bold**, *Italic*, <u>Underline</u>, ~~Strikethrough~~
  - Heading 1 & 2, Code block (`<pre>`)
  - Ordered and unordered lists
  - Hyperlink insertion with URL prompt
  - **Text color picker** — 6 colors: default / red / orange / green / blue / purple
- **Emoji picker** — 48 curated emojis; popup grid attached to toolbar button
- **Inline image paste** — paste images from clipboard directly into the message body (stored as base64 data URLs)
- **Drag & drop attachments** — drag files onto the compose window; animated drop-zone overlay appears
- **File attachments** — attach multiple files, shows filename + KB size, remove individually
- **CC / BCC** — toggle-show extra address fields, contact autocomplete in all address inputs
- **Contact autocomplete** — fuzzy name + address matching from the harvested contact list
- **Priority flag** — click to cycle Normal `—` / High `!` / Low `↓`; header badge shown on High
- **Read receipt** — double-tick icon toggle; flag added to the outgoing message headers
- **Word count** — live word counter updates in the footer as you type
- **Undo send** — 10-second countdown toast after clicking Send; cancel before actual delivery
- **Scheduled send** — datetime picker to queue delivery for a future time
- **Save draft** — manual save to Drafts folder
- **Auto-save draft** — silent background save every 30 seconds when the compose window is dirty
- **Keyboard shortcut** — `Cmd/Ctrl + Enter` to send from anywhere inside the compose window
- **Resizable window** — drag the bottom-right handle to any size

### Settings (6 tabs)

| Tab | Options |
|-----|---------|
| **Compose** | Display name (shown in From), email signature (auto-appended to new messages) |
| **Reading** | Block external images toggle, auto-mark-as-read toggle, messages per page (25 / 50 / 100) |
| **Accounts** | Add / remove IMAP accounts; credentials encrypted with AES-256-GCM before storage |
| **Vacation** | Auto-reply message with subject, body, active date range, and on/off toggle |
| **Rules** | Inbox filter rules — if `from/to/subject` `contains/equals/starts-with/ends-with` → `move/flag/mark-read/delete` |
| **Shortcuts** | Keyboard shortcut reference card |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `r` | Reply |
| `a` | Reply All |
| `f` | Forward |
| `d` | Delete message |
| `u` | Mark as unread |
| `j` / `↓` | Next message |
| `k` / `↑` | Previous message |
| `Esc` | Close compose / settings |
| `Cmd+Enter` | Send (inside compose) |

---

## Stack

### Frontend

| Package | Version | Role |
|---------|---------|------|
| React | 19 | UI framework |
| Vite | 8 | Build tooling & HMR dev server |
| Tailwind CSS | 4 | Utility-first styling (new CSS-native engine) |
| GSAP | 3 | Panel slide transitions & animation timelines |
| Motion | 12 | Spring-physics list entry animations |

### Backend

| Package | Role |
|---------|------|
| Express | HTTP server, session middleware, routing |
| ImapFlow | IMAP client (list, fetch, flags, copy, move, delete) |
| Nodemailer | SMTP send via `MailComposer` |
| mailparser | Full MIME parsing — attachments, HTML/plain, address objects |
| multer | Multipart/form-data for file attachment uploads |
| express-session | Session cookie management |
| express-rate-limit | Per-IP throttling on auth and send endpoints |

### Security

- **AES-256-GCM** — IMAP credentials encrypted at rest using a key derived from `SESSION_SECRET`; IV and auth tag stored alongside ciphertext; never stored in plaintext
- **Session cookies** — `httpOnly: true`, `sameSite: 'strict'`, `secure: true` in production
- **Rate limiting** — auth endpoint: 10 requests / 15 min; send endpoint: 20 requests / 15 min
- **No third-party services** — all mail flows through your own IMAP/SMTP server, zero external API calls
- **External image blocking** — default-on blocks tracking pixels and arbitrary remote fetches

---

## Architecture

```
magicube/
├── server.js              # Express backend — IMAP/SMTP proxy, session auth, REST API
├── ecosystem.config.js    # PM2 process configuration
├── data/                  # Persistent server-side storage
│   ├── accounts.enc       # Encrypted IMAP accounts (AES-256-GCM)
│   ├── vacation.json      # Auto-reply config
│   └── rules.json         # Inbox filter rules
└── client/                # React frontend (built by Vite → ../public/)
    ├── src/
    │   ├── App.jsx            # Root layout, panel state machine, GSAP transitions
    │   ├── api/
    │   │   └── mail.js        # Fetch wrapper for all REST endpoints
    │   ├── hooks/
    │   │   ├── useAuth.js     # Session state, login/logout
    │   │   └── useMail.js     # useMessages + useMessage with AbortController cleanup
    │   └── components/
    │       ├── Login.jsx          # Auth form with ClickSpark animation on submit
    │       ├── Sidebar.jsx        # IMAP folder tree, compose trigger, settings trigger
    │       ├── MessageList.jsx    # Paginated list, thread grouping, search, bulk ops
    │       ├── MessageView.jsx    # HTML iframe renderer, attachment gallery, reply/forward
    │       ├── Compose.jsx        # Rich compose window (full feature set — see above)
    │       ├── Settings.jsx       # 6-tab settings panel
    │       └── bits/              # Animated UI primitives (no dependencies beyond GSAP/Motion)
    │           ├── AnimatedList.jsx   # Spring-staggered list item entry via Motion
    │           ├── BlurText.jsx       # Character-by-character blur-to-sharp reveal
    │           ├── ClickSpark.jsx     # SVG spark burst radiating from click point
    │           ├── CountUp.jsx        # Animated integer counter (count-up on mount)
    │           ├── DecryptedText.jsx  # Random-char scramble to real text animation
    │           ├── FadeContent.jsx    # IntersectionObserver-triggered fade in
    │           ├── Orb.jsx            # Animated radial-gradient orb (loading states)
    │           ├── ShinyText.jsx      # CSS shimmer sweep over text
    │           └── SpotlightCard.jsx  # Mouse-tracking spotlight glow on card border
    └── public/            # Built static assets served by Express
```

---

## API Reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Login with IMAP credentials (rate-limited: 10 req/15 min) |
| `POST` | `/auth/logout` | Destroy session |
| `GET`  | `/auth/me` | Return current session user |

### Messages

| Method | Path | Description |
|--------|------|-------------|
| `GET`    | `/api/folders` | List all IMAP folders with unread counts |
| `GET`    | `/api/messages` | Paginated list — `?folder=&page=&limit=&search=` |
| `GET`    | `/api/messages/:uid` | Full message with parsed body and attachment list |
| `GET`    | `/api/messages/:uid/source` | Raw MIME source text |
| `GET`    | `/api/messages/:uid/attachment/:index` | Download attachment by index |
| `PATCH`  | `/api/messages/:uid/flags` | Add/remove IMAP flags (`\Seen`, `\Flagged`, …) |
| `DELETE` | `/api/messages/:uid` | Move to Trash or permanent delete |
| `POST`   | `/api/messages/:uid/move` | Move to another folder |
| `POST`   | `/api/messages/bulk/flags` | Bulk flag update for multiple UIDs |
| `POST`   | `/api/messages/bulk/delete` | Bulk delete for multiple UIDs |

### Sending

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/send` | Send message — `multipart/form-data` with optional `attachments[]` (rate-limited: 20 req/15 min) |
| `POST` | `/api/draft` | Save message to Drafts folder |
| `POST` | `/api/schedule` | Queue message for future delivery |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| `GET` / `POST` | `/api/vacation` | Get or set vacation auto-reply config |
| `GET` / `POST` | `/api/rules` | Get or replace inbox filter rules |
| `GET`          | `/api/accounts` | List saved IMAP accounts |
| `POST`         | `/api/accounts` | Add account (credentials encrypted before write) |
| `DELETE`       | `/api/accounts/:id` | Remove account |

---

## Setup

### Prerequisites

- Node.js 20+
- PM2 (`npm i -g pm2`)
- An IMAP/SMTP server — [Mailcow](https://mailcow.email/) on the same network works perfectly

### Install

```bash
git clone https://github.com/MagnusMagi/MagiCube.git
cd MagiCube

# Backend dependencies
npm install

# Frontend — build production bundle into ../public/
cd client
npm install
npm run build
cd ..
```

### Environment Variables

Set in `ecosystem.config.js` (or as real env vars in your shell):

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | ✅ | 32+ byte random hex. Used as AES key for credential encryption. |
| `PORT` | — | HTTP port Express listens on. Default: `8891` |
| `IMAP_HOST` | — | IMAP server hostname or IP. Default: `172.30.1.250` |
| `IMAP_PORT` | — | IMAP port. Default: `993` (TLS) |
| `SMTP_HOST` | — | SMTP server hostname or IP. Default: `172.30.1.253` |
| `SMTP_PORT` | — | SMTP port. Default: `587` (STARTTLS) |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Run

```bash
# Development (hot reload)
cd client && npm run dev    # Vite HMR on :5173 (proxies /api to :8891)
node server.js             # API + session server on :8891

# Production via PM2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

### Reverse Proxy (Caddy)

```
magicube.example.com {
    reverse_proxy localhost:8891
}
```

Nginx equivalent:

```nginx
server {
    listen 443 ssl;
    server_name magicube.example.com;
    location / {
        proxy_pass http://localhost:8891;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

---

## Design System

MagiCube uses a custom zinc-based dark theme built on Tailwind CSS v4 (CSS-native engine, no PostCSS config required).

| Token | Value | Usage |
|-------|-------|-------|
| App background | `zinc-950` | Outermost shell |
| Panel surface | `zinc-900` | Sidebars, modals |
| Card surface | `zinc-800` | Input fields, attachment chips |
| Divider | `zinc-800/60` | Borders, separators |
| Muted text | `zinc-500` | Labels, timestamps, placeholders |
| Body text | `zinc-300` | Message content |
| Primary text | `zinc-100` | Headings, active items |
| Active gradient | `from-zinc-700 to-zinc-800` | Selected list items, active tabs |
| Accent | `violet-500/600` | Focus rings, toggles, send button |
| Warning | `red-400` | High priority badge, error states |

Active/selected states use a `bg-linear-to-b from-zinc-700 to-zinc-800` gradient rather than a flat color, adding subtle depth without high contrast.

Animation libraries are used intentionally:
- **GSAP** handles panel slide-in/out transitions (precise easing, interruption-safe)
- **Motion** handles list item entry (spring physics via `AnimatePresence`)
- CSS `transition-*` handles simple hover/focus state changes only

---

## Data Storage

All persistent data lives in `data/` as JSON files (encrypted where sensitive). Nothing writes to a database.

| File | Contents |
|------|----------|
| `accounts.enc` | Array of IMAP accounts: `[{ id, email, iv, tag, encrypted }]` — AES-256-GCM per entry |
| `vacation.json` | `{ enabled: bool, subject: string, body: string, from: date, until: date }` |
| `rules.json` | `[{ id, name, condField, condOp, condValue, actionType, actionFolder?, actionFlag? }]` |

Session state (including the per-user IMAP connection) lives in memory via `express-session`. When the server restarts, users are prompted to log in again — no tokens persist between restarts.

---

## License

MIT — see [LICENSE](LICENSE)
