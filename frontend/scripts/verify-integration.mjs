import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

// Интеграция настоящих модулей Vue с работающим API. Браузер и DOM не запускаются.
// Каждый прогон сохраняет одну учебную заявку; база не очищается.
const apiBaseUrl = 'http://localhost:5000'
const description = '<script>alert(1)</script>'
const frontendPath = fileURLToPath(new URL('../', import.meta.url))
const evidencePath = fileURLToPath(new URL('../../docs/reports/evidence/lab-11/frontend-integration.json', import.meta.url))
const storage = new Map()
const requests = []
const checks = []
const servers = new Set()
let createdTicket = null
let context = null
let failed = false
const nativeFetch = globalThis.fetch
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')

function restoreGlobal(name, descriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor)
  else delete globalThis[name]
}

async function check(name, action) {
  const result = { name, passed: false }
  checks.push(result)
  await action()
  result.passed = true
}

async function expectApiError(action, client, status, message) {
  let caught
  try { await action() } catch (error) { caught = error }
  assert.ok(caught instanceof client.ApiError)
  assert.equal(caught.status, status)
  assert.equal(caught.message, message)
}

async function loadModules() {
  const server = await createServer({
    root: frontendPath, configFile: false, envFile: false, publicDir: false,
    logLevel: 'silent', plugins: [vue()],
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  servers.add(server)
  return {
    server,
    session: await server.ssrLoadModule('/src/auth/session.js'),
    client: await server.ssrLoadModule('/src/api/client.js'),
    auth: await server.ssrLoadModule('/src/api/auth.js'),
    tickets: await server.ssrLoadModule('/src/api/tickets.js'),
    TicketTable: (await server.ssrLoadModule('/src/components/TicketTable.vue')).default,
  }
}

try {
  const window = new EventTarget()
  window.location = { search: '' }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  } })
  globalThis.fetch = async (url, options = {}) => {
    // Не записываем тело запроса, заголовки, JWT, пароли или тело ответа.
    const metadata = {
      url: String(url), method: options.method ?? 'GET', status: null,
      tokenPresent: new Headers(options.headers).has('Authorization'),
    }
    requests.push(metadata)
    const response = await nativeFetch(url, { ...options, signal: AbortSignal.timeout(10_000) })
    metadata.status = response.status
    return response
  }
  context = await loadModules()

  await check('Frontend login authenticates dispatcher through the real API', async () => {
    // Только опубликованные учебные учётки из README; не пароли живых людей.
    const user = await context.auth.login('dispatcher1', 'Lab11-Dispatcher!2026')
    assert.equal(user.id, 1)
    assert.equal(user.role, 'Dispatcher')
    assert.ok(context.session.accessToken.value)
    assert.equal(requests.at(-1).status, 200)
    assert.equal(requests.at(-1).tokenPresent, false)
  })

  await check('Frontend createTicket persists the exact script description through the real API', async () => {
    const created = await context.tickets.createTicket({
      title: 'Проверка безопасного вывода Vue', equipmentId: 7, description,
    })
    assert.ok(Number.isInteger(created.id) && created.id > 0)
    assert.equal(created.description, description)
    assert.equal(created.createdByUserId, 1)
    assert.equal(created.status, 'New')
    assert.equal(requests.at(-1).status, 201)
    assert.equal(requests.at(-1).tokenPresent, true)
    createdTicket = { id: created.id, number: created.number }
  })

  let storedTicket
  await check('Frontend getTickets reads the saved description from the real API', async () => {
    const items = await context.tickets.getTickets()
    storedTicket = items.find((item) => item.id === createdTicket.id)
    assert.ok(storedTicket)
    assert.equal(storedTicket.description, description)
    assert.equal(requests.at(-1).status, 200)
    assert.equal(requests.at(-1).tokenPresent, true)
  })

  await check('Actual TicketTable SSR escapes the API description and creates no script element', async () => {
    const html = await renderToString(createSSRApp(context.TicketTable, { items: [storedTicket] }))
    assert.match(html, /<p[^>]*class="ticket-description"[^>]*>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/p>/)
    assert.doesNotMatch(html, /<script\b/i)
  })

  await check('Fresh frontend module graph restores storage and verifies it with a real GET /api/auth/me', async () => {
    const previousServer = context.server
    await previousServer.close()
    servers.delete(previousServer)
    const requestCount = requests.length
    context = await loadModules()
    assert.ok(context.session.accessToken.value)
    assert.equal(await context.auth.ensureSession(), true)
    assert.equal(context.session.authUser.value.id, 1)
    assert.equal(context.session.authUser.value.role, 'Dispatcher')
    const calls = requests.slice(requestCount)
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0], {
      url: `${apiBaseUrl}/api/auth/me`, method: 'GET', status: 200, tokenPresent: true,
    })
  })

  await check('Logout clears storage and the protected frontend client refuses a request without a token', async () => {
    context.session.clearSession()
    assert.equal(context.session.accessToken.value, '')
    assert.equal(storage.size, 0)
    const requestCount = requests.length
    await expectApiError(() => context.tickets.getTickets(), context.client, 401,
      'Сеанс завершён. Войдите снова.')
    // Это отказ клиента до fetch; серверный гостевой 401 проверяется HTTP-коллекцией.
    assert.equal(requests.length, requestCount)
  })

  await check('Wrong password through frontend login returns the real 401 and a readable ApiError', async () => {
    await expectApiError(() => context.auth.login('dispatcher1', 'Wrong-Demo-Password'),
      context.client, 401, 'Неверный логин или пароль.')
    assert.equal(requests.at(-1).status, 401)
    assert.equal(context.session.accessToken.value, '')
  })

  await check('Frontend login authenticates an engineer through the real API', async () => {
    const user = await context.auth.login('engineer1', 'Lab11-Engineer1!2026')
    assert.equal(user.id, 2)
    assert.equal(user.role, 'Engineer')
    assert.equal(requests.at(-1).status, 200)
  })

  await check('Engineer createTicket receives the real 403 with a readable ApiError', async () => {
    await expectApiError(() => context.tickets.createTicket({
      title: 'Запрещённое создание инженером', equipmentId: 7, description,
    }), context.client, 403, 'Недостаточно прав для этого действия.')
    assert.equal(requests.at(-1).status, 403)
    assert.equal(requests.at(-1).tokenPresent, true)
    assert.equal(context.session.authUser.value.id, 2)
    assert.ok(context.session.accessToken.value)
  })
} catch {
  // Assert может содержать значения аргументов: не выводим его текст или stack.
  failed = true
} finally {
  context?.session.clearSession()
  await Promise.all([...servers].map((server) => server.close()))
  globalThis.fetch = nativeFetch
  restoreGlobal('window', originalWindow)
  restoreGlobal('sessionStorage', originalStorage)
  const summary = {
    verification: 'Vue modules with real API, without a browser',
    browserUsed: false,
    rendering: 'SSR of the actual TicketTable.vue; no DOM or browser execution',
    sessionReload: 'Fresh Vite SSR module graph with the same in-memory sessionStorage',
    guestCheck: 'Frontend ApiError 401 before fetch after logout; no HTTP request sent',
    executedAt: new Date().toISOString(), apiBaseUrl,
    result: failed ? 'failed' : 'passed',
    checksTotal: checks.length, checksPassed: checks.filter((item) => item.passed).length,
    createdTicket, checks, requests,
  }
  await mkdir(dirname(evidencePath), { recursive: true })
  await writeFile(evidencePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(summary, null, 2))
  process.exitCode = failed ? 1 : 0
}
