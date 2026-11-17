import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

// Настоящие модули Vue и работающий API. Скрипт не запускает браузер.
// Создаёт одну учебную заявку, назначает и оставляет её в InProgress.
const evidencePath = fileURLToPath(new URL('../../docs/reports/evidence/lab-12/frontend-integration.json', import.meta.url))
const originalFetch = globalThis.fetch
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
const checks = []
const requests = []
let server, session, createdTicket, failed = false

async function check(name, action) {
  const item = { name, passed: false }
  checks.push(item)
  await action()
  item.passed = true
}
function restore(name, descriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor)
  else delete globalThis[name]
}

try {
  const storage = new Map()
  const window = new EventTarget()
  window.location = { search: '' }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  } })
  globalThis.fetch = async (url, options = {}) => {
    // Только метаданные. JWT, пароли и тела входа не сохраняются.
    const metadata = { url: String(url), method: options.method ?? 'GET', status: null,
      tokenPresent: new Headers(options.headers).has('Authorization') }
    requests.push(metadata)
    const response = await originalFetch(url, { ...options, signal: AbortSignal.timeout(10_000) })
    metadata.status = response.status
    return response
  }
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envDir: false,
    publicDir: false, logLevel: 'silent', plugins: [vue()],
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  session = await server.ssrLoadModule('/src/auth/session.js')
  const auth = await server.ssrLoadModule('/src/api/auth.js')
  const tickets = await server.ssrLoadModule('/src/api/tickets.js')
  const references = await server.ssrLoadModule('/src/api/references.js')
  const { ApiError } = await server.ssrLoadModule('/src/api/client.js')
  const TicketTable = (await server.ssrLoadModule('/src/components/TicketTable.vue')).default
  let equipment, engineers, selectedEquipment, selectedEngineer, created, assigned, working

  await check('Dispatcher signs in through the actual frontend auth module', async () => {
    const user = await auth.login('dispatcher1', 'Lab11-Dispatcher!2026')
    assert.equal(user.role, 'Dispatcher')
    assert.equal(requests.at(-1).status, 200)
  })
  await check('Equipment list is loaded from PostgreSQL through the API', async () => {
    equipment = await references.getEquipment()
    selectedEquipment = equipment.find((item) => item.id === 7)
    assert.ok(selectedEquipment)
    assert.ok(selectedEquipment.clientName)
    assert.equal(requests.at(-1).url, 'http://localhost:5000/api/equipment')
    assert.equal(requests.at(-1).status, 200)
  })
  await check('Engineer list is loaded through the API without credentials', async () => {
    engineers = await references.getEngineers()
    selectedEngineer = engineers.find((item) => item.id === 2)
    assert.ok(selectedEngineer)
    for (const item of engineers) assert.deepEqual(Object.keys(item).sort(), ['fullName', 'id'])
    assert.equal(requests.at(-1).status, 200)
  })
  await check('Frontend creates a real ticket with a server ID and number', async () => {
    created = await tickets.createTicket({ title: 'Проверка сквозного сценария модулей Vue',
      equipmentId: selectedEquipment.id, description: 'Создание, назначение и начало работы через настоящий API.' })
    assert.ok(Number.isInteger(created.id) && created.id > 0)
    assert.equal(created.status, 'New')
    assert.equal(created.assigneeUserId, null)
    assert.equal(created.createdByUserId, 1)
    assert.equal(requests.at(-1).status, 201)
    createdTicket = { id: created.id, number: created.number }
  })
  await check('Assignment preserves the ID, number and New status', async () => {
    assigned = await tickets.assignTicket(created.id, selectedEngineer.id)
    assert.equal(assigned.id, created.id)
    assert.equal(assigned.number, created.number)
    assert.equal(assigned.status, 'New')
    assert.equal(assigned.assigneeUserId, selectedEngineer.id)
    assert.equal(assigned.assigneeFullName, selectedEngineer.fullName)
    assert.equal(requests.at(-1).method, 'PATCH')
    assert.equal(requests.at(-1).status, 200)
  })
  await check('Engineer performs a second real login', async () => {
    const user = await auth.login('engineer1', 'Lab11-Engineer1!2026')
    assert.equal(user.id, selectedEngineer.id)
    assert.equal(user.role, 'Engineer')
    assert.equal(requests.at(-1).status, 200)
  })
  await check('Engineer sees the same assigned New ticket', async () => {
    const rows = await tickets.getTickets('New')
    const row = rows.find((item) => item.id === created.id)
    assert.equal(row?.number, created.number)
    assert.ok(rows.every((item) => item.assigneeUserId === selectedEngineer.id && item.status === 'New'))
  })
  await check('Engineer starts the same ticket with a separate status PATCH', async () => {
    working = await tickets.changeTicketStatus(created.id, 'InProgress')
    assert.equal(working.id, created.id)
    assert.equal(working.number, created.number)
    assert.equal(working.status, 'InProgress')
    assert.equal(working.assigneeUserId, selectedEngineer.id)
    for (const field of ['title', 'description', 'equipmentId', 'clientId', 'createdByUserId', 'createdAt']) {
      assert.equal(working[field], assigned[field])
    }
    assert.equal(requests.at(-1).status, 200)
    createdTicket.status = working.status
    createdTicket.assigneeUserId = working.assigneeUserId
  })
  await check('Real InProgress filter preserves engineer visibility', async () => {
    const rows = await tickets.getTickets('InProgress')
    assert.equal(rows.find((item) => item.id === created.id)?.number, created.number)
    assert.ok(rows.every((item) => item.status === 'InProgress' && item.assigneeUserId === selectedEngineer.id))
  })
  await check('Actual table renders ID, number, assignee, status and correct role action', async () => {
    const html = await renderToString(createSSRApp(TicketTable, { items: [working], user: session.authUser.value }))
    assert.ok(html.includes(`ID заявки: ${created.id}`))
    assert.ok(html.includes(created.number))
    assert.ok(html.includes(selectedEngineer.fullName))
    assert.match(html, /В работе/)
    assert.match(html, />Завершить<\/button>/)
    assert.doesNotMatch(html, />Назначить<\/button>|>Взять в работу<\/button>/)
  })
  await check('Second engineer cannot see or modify the ticket', async () => {
    await auth.login('engineer2', 'Lab11-Engineer2!2026')
    const rows = await tickets.getTickets('InProgress')
    assert.ok(!rows.some((item) => item.id === created.id))
    await assert.rejects(() => tickets.changeTicketStatus(created.id, 'Closed'),
      (error) => error instanceof ApiError && error.status === 403)
  })
} catch {
  // Значения токенов и полные тела ответов не попадают в диагностику.
  failed = true
} finally {
  session?.clearSession()
  await server?.close()
  globalThis.fetch = originalFetch
  restore('window', originalWindow)
  restore('sessionStorage', originalStorage)
  const summary = { verification: 'Actual frontend modules with the real API, without a browser',
    browserUsed: false, rendering: 'SSR of actual TicketTable.vue',
    checkedAt: new Date().toISOString(), status: failed ? 'failed' : 'passed',
    checks: checks.length, passed: checks.filter((item) => item.passed).length,
    failures: checks.filter((item) => !item.passed).length, createdTicket, results: checks, requests }
  await mkdir(dirname(evidencePath), { recursive: true })
  await writeFile(evidencePath, JSON.stringify(summary, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify(summary, null, 2))
  process.exitCode = failed ? 1 : 0
}
