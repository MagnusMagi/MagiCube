'use strict'
/**
 * Playwright screenshot script for MagiCube.
 * Starts demo-server.js, captures key screens, saves to screenshots/.
 *
 * Usage: node take-screenshots.js
 */
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const BASE = 'http://127.0.0.1:8893'
const OUT = path.join(__dirname, 'screenshots')
const VIEWPORT = { width: 1400, height: 900 }

fs.mkdirSync(OUT, { recursive: true })

async function waitForServer(url, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url)
      if (r.ok || r.status === 401) return
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Server never became ready at ${url}`)
}

async function shot(page, name, extra = '') {
  await page.waitForTimeout(600)
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`  ✓ ${name}.png${extra ? '  ' + extra : ''}`)
}

async function main() {
  console.log('Starting demo server…')
  const srv = spawn('node', ['demo-server.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  srv.stdout.on('data', d => process.stdout.write('  [demo] ' + d))
  srv.stderr.on('data', d => process.stderr.write('  [demo] ' + d))

  await waitForServer(`${BASE}/auth/me`)
  console.log('Demo server ready.\n')

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: VIEWPORT })
  const page = await ctx.newPage()

  try {
    console.log('Capturing screens…')

    // ── 1. Login screen ────────────────────────────────────────────────────
    await page.goto(BASE)
    await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 8000 })
    await shot(page, '01-login')

    // ── 2. Auto-login via /demo-login ──────────────────────────────────────
    // Capture console errors from the page
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('  [browser-error]', msg.text())
    })
    page.on('pageerror', err => console.log('  [page-error]', err.message))

    await page.goto(`${BASE}/demo-login`, { waitUntil: 'load' })
    // Wait for React to mount — root div gets children once React renders
    await page.waitForFunction(() => document.getElementById('root')?.children.length > 0, { timeout: 10000 })
      .catch(() => console.log('  [warn] root never populated'))
    await page.waitForTimeout(2000)

    // ── 3. Inbox (dark mode) ───────────────────────────────────────────────
    await shot(page, '02-inbox', '(full inbox, dark mode)')

    // ── 4. Light mode ─────────────────────────────────────────────────────
    // Sidebar bottom: button title="Dark mode" (when currently light) or "Light mode"
    const themeToggle = page.locator('button[title="Light mode"], button[title="Dark mode"]').first()
    if (await themeToggle.count() > 0) {
      await themeToggle.click()
      await page.waitForTimeout(500)
      await shot(page, '03-inbox-light', '(light mode)')
      await themeToggle.click()
      await page.waitForTimeout(300)
    }

    // ── 5. Open a message ─────────────────────────────────────────────────
    // MessageList renders SpotlightCard divs with sender name in a span
    const firstMsg = page.locator('span').filter({ hasText: 'Sarah Chen' }).first()
    if (await firstMsg.count() > 0) {
      await firstMsg.click()
      await page.waitForTimeout(1500)
      await shot(page, '04-message-view', '(message open)')
    }

    // ── 6. Compose window ─────────────────────────────────────────────────
    // Sidebar has a button with text "Compose"
    const composeBtn = page.locator('button').filter({ hasText: /^Compose$/i }).first()
    if (await composeBtn.count() > 0) {
      await composeBtn.click()
      await page.waitForTimeout(900)
      const toField = page.locator('input[placeholder*="To" i]').first()
      if (await toField.count() > 0) await toField.fill('lena@gamedev.studio')
      const subjectField = page.locator('input[placeholder*="Subject" i]').first()
      if (await subjectField.count() > 0) await subjectField.fill('Re: match replay feature spec')
      await page.waitForTimeout(300)
      await shot(page, '05-compose', '(compose window)')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    // ── 7. Global search (Ctrl+K) ─────────────────────────────────────────
    // Also triggered by "Search all…" button in sidebar
    const searchAllBtn = page.locator('span').filter({ hasText: 'Search all…' }).first()
    if (await searchAllBtn.count() > 0) {
      await searchAllBtn.click()
    } else {
      await page.keyboard.press('Control+k')
    }
    await page.waitForTimeout(600)
    const searchInput = page.locator('input').filter({ hasText: '' }).last() // modal input
    const modalInput = page.locator('input[placeholder*="Search" i], input[placeholder*="search" i]').first()
    if (await modalInput.count() > 0) {
      await modalInput.fill('design')
      await page.waitForTimeout(900)
      await shot(page, '06-global-search', '(global search modal)')
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // ── 8. Settings → Labels ──────────────────────────────────────────────
    // Sidebar bottom: button title="Settings"
    const settingsBtn = page.locator('button[title="Settings"]').first()
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click()
      await page.waitForTimeout(800)
      const labelsTab = page.locator('button').filter({ hasText: /^Labels$/i }).first()
      if (await labelsTab.count() > 0) {
        await labelsTab.click()
        await page.waitForTimeout(600)
        await shot(page, '07-settings-labels', '(Settings → Labels)')
      } else {
        await shot(page, '07-settings', '(Settings panel)')
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }

    // ── 9. Settings → Templates ───────────────────────────────────────────
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click()
      await page.waitForTimeout(800)
      const tmplTab = page.locator('button').filter({ hasText: /^Templates$/i }).first()
      if (await tmplTab.count() > 0) {
        await tmplTab.click()
        await page.waitForTimeout(600)
        await shot(page, '08-settings-templates', '(Settings → Templates)')
      }
      await page.keyboard.press('Escape')
    }

    const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'))
    console.log(`\nDone! ${files.length} screenshots saved to ./screenshots/`)
    console.log(files.map(f => `  ${f}`).join('\n'))

  } finally {
    await browser.close()
    srv.kill('SIGTERM')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
