import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, h } from 'vue'
import { routeLocationKey } from 'vue-router'
import { renderToString } from 'vue/server-renderer'

let server, session, client, auth, tickets, TicketTable, TicketList
let expiredEvents = 0
const originalFetch = globalThis.fetch
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')

function restoreGlobal(name, descriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor)
  else delete globalThis[name]
}

function deferred() {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}

function account(id, token) {
  return {
    accessToken: token,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: { id, login: `user${id}`, fullName: `Сотрудник ${id}`, role: 'Engineer' },
  }
}

// Fetch уже вернул заголовки, но чтение тела удерживается до действия теста.
function delayedResponse(status) {
  const reading = deferred()
  const body = deferred()
  globalThis.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: () => { reading.resolve(); return body.promise },
  })
  return { reading: reading.promise, finish: (value) => body.resolve(JSON.stringify(value)) }
}

const unauthorized = (error) => error instanceof client.ApiError && error.status === 401

before(async () => {
  const storage = new Map()
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  } })
  const window = new EventTarget()
  window.location = { search: '' }
  window.addEventListener('session-expired', () => { expiredEvents++ })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
  // Загружаем настоящие модули и SFC. Сервер HTTP и браузер не запускаются.
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false, publicDir: false, plugins: [vue()],
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  session = await server.ssrLoadModule('/src/auth/session.js')
  client = await server.ssrLoadModule('/src/api/client.js')
  auth = await server.ssrLoadModule('/src/api/auth.js')
  tickets = await server.ssrLoadModule('/src/ticketsStore.js')
  TicketTable = (await server.ssrLoadModule('/src/components/TicketTable.vue')).default
  TicketList = (await server.ssrLoadModule('/src/pages/TicketList.vue')).default
})

beforeEach(() => {
  session.clearSession()
  session.setSession(account(2, 'first-session'))
  expiredEvents = 0
})

after(async () => {
  await server?.close()
  globalThis.fetch = originalFetch
  restoreGlobal('window', originalWindow)
  restoreGlobal('sessionStorage', originalStorage)
})

test('current session receives a successful response', async () => {
  const response = delayedResponse(200)
  const request = client.requestJson('/api/support-tickets')
  await response.reading
  response.finish([{ id: 17 }])
  assert.deepEqual(await request, [{ id: 17 }])
  assert.equal(session.accessToken.value, 'first-session')
})

test('current 401 expires the current session', async () => {
  const response = delayedResponse(401)
  tickets.items.value = [{ id: 17 }]
  const request = client.requestJson('/api/support-tickets')
  await response.reading
  response.finish({ title: 'Unauthorized' })
  await assert.rejects(request, unauthorized)
  assert.equal(session.accessToken.value, '')
  assert.deepEqual(tickets.items.value, [])
  assert.equal(expiredEvents, 1)
})

test('logout during response.text rejects the old 200 instead of returning old data', async () => {
  const response = delayedResponse(200)
  const request = client.requestJson('/api/support-tickets').then((items) => { tickets.items.value = items })
  await response.reading
  session.clearSession()
  response.finish([{ id: 17, description: 'Данные первого сотрудника' }])
  await assert.rejects(request, unauthorized)
  assert.equal(session.accessToken.value, '')
  assert.deepEqual(tickets.items.value, [])
  assert.equal(expiredEvents, 0)
})

test('account switch during response.text keeps the new session and its list', async () => {
  const response = delayedResponse(200)
  const request = client.requestJson('/api/support-tickets').then((items) => { tickets.items.value = items })
  await response.reading
  session.setSession(account(3, 'second-session'))
  tickets.items.value = [{ id: 18 }]
  response.finish([{ id: 17 }])
  await assert.rejects(request, unauthorized)
  assert.equal(session.accessToken.value, 'second-session')
  assert.equal(session.authUser.value.id, 3)
  assert.deepEqual(tickets.items.value, [{ id: 18 }])
  assert.equal(expiredEvents, 0)
})

test('old 401 after a new login cannot expire the new session', async () => {
  const response = delayedResponse(401)
  const request = client.requestJson('/api/support-tickets')
  await response.reading
  session.setSession(account(3, 'second-session'))
  response.finish({ title: 'Expired token from the first session' })
  await assert.rejects(request, unauthorized)
  assert.equal(session.accessToken.value, 'second-session')
  assert.equal(session.authUser.value.id, 3)
  assert.equal(expiredEvents, 0)
})

test('late login 200 after logout cannot restore the cancelled session', async () => {
  const response = delayedResponse(200)
  const request = auth.login('user3', 'OnlyAUnitTestPassword')
  await response.reading
  session.clearSession()
  response.finish(account(3, 'late-session'))
  await assert.rejects(request, unauthorized)
  assert.equal(session.accessToken.value, '')
  assert.equal(session.authUser.value, null)
  assert.deepEqual(tickets.items.value, [])
})

test('TicketList ignores simultaneous old GET success or failure after another login completes', async () => {
  // Запускаем настоящий setup SFC внутри SSR-контекста, чтобы получить его
  // loadTickets и refs без DOM. onMounted в SSR не вызывается автоматически.
  let state
  const app = createSSRApp({ setup() {
    state = TicketList.setup({}, { expose() {} })
    return () => h('div')
  } })
  app.provide(routeLocationKey, { query: {} })
  await renderToString(app)
  assert.equal(typeof state.loadTickets, 'function')

  for (const status of [200, 500]) {
    session.setSession(account(2, 'first-session'))
    const loginReading = deferred()
    const getReading = deferred()
    const loginBody = deferred()
    const getBody = deferred()
    globalThis.fetch = async (url) => {
      const isLogin = String(url).endsWith('/api/auth/login')
      const responseStatus = isLogin ? 200 : status
      return {
        ok: responseStatus >= 200 && responseStatus < 300,
        status: responseStatus,
        text: () => {
          (isLogin ? loginReading : getReading).resolve()
          return (isLogin ? loginBody : getBody).promise
        },
      }
    }
    const loading = state.loadTickets()
    const signingIn = auth.login('user3', 'OnlyAUnitTestPassword')
    await Promise.all([loginReading.promise, getReading.promise])
    // Оба тела завершаются в одном стеке: HTTP-клиент успевает принять старый
    // ответ до setSession, но запись в TicketList происходит уже после него.
    loginBody.resolve(JSON.stringify(account(3, `second-session-${status}`)))
    getBody.resolve(JSON.stringify(status === 200 ? [{ id: 17 }] : { title: 'Old failure' }))
    await Promise.all([signingIn, loading])

    assert.equal(session.authUser.value.id, 3)
    assert.equal(session.accessToken.value, `second-session-${status}`)
    assert.deepEqual(tickets.items.value, [])
    assert.equal(state.screen.value, 'loading')
    assert.equal(state.errorMessage.value, '')
    assert.equal(expiredEvents, 0)
  }
})

test('TicketTable renders the exact script description as escaped text', async () => {
  const html = await renderToString(createSSRApp(TicketTable, { items: [{
    id: 17, number: 'SUP-2026-0001', title: 'Проверка вывода описания',
    equipmentId: 7, equipmentName: 'Принтер', clientName: 'Клиент А',
    description: '<script>alert(1)</script>', status: 'New',
  }] }))
  assert.match(html, /<p[^>]*class="ticket-description"[^>]*>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/p>/)
  assert.doesNotMatch(html, /<script\b/i)
})
