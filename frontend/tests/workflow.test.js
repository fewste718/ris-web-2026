import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRenderer, createSSRApp, h, ssrContextKey } from 'vue'
import { routeLocationKey, routerKey } from 'vue-router'
import { renderToString } from 'vue/server-renderer'

let server, session, store, api, references, TicketTable, TicketList, TicketNew
const originalFetch = globalThis.fetch
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
const equipmentRow = { id: 42, name: 'Оборудование из API', clientId: 3, clientName: 'Клиент А' }
const ticket = { id: 17, number: 'SUP-2026-0017', title: 'Заявка из API', description: 'Описание неисправности', equipmentId: 42, equipmentName: equipmentRow.name, clientId: 3, clientName: 'Клиент А', status: 'New', assigneeUserId: null, assigneeFullName: null }
const dispatcher = { id: 1, login: 'dispatcher1', fullName: 'Диспетчер 1', role: 'Dispatcher' }
const engineer = { id: 2, login: 'engineer1', fullName: 'Инженер 1', role: 'Engineer' }

function signIn(user = dispatcher) {
  session.setSession({ accessToken: `test-session-${user.id}`, expiresAt: new Date(Date.now() + 60_000).toISOString(), user })
}
const reply = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(data) })
function deferred() {
  let resolve
  const promise = new Promise((complete) => { resolve = complete })
  return { promise, resolve }
}
async function componentState(component, router = { push: async () => {} }) {
  let state
  const app = createSSRApp({ setup() {
    state = component.setup({}, { expose() {} })
    return () => h('div')
  } })
  app.provide(routeLocationKey, { query: {} })
  app.provide(routerKey, router)
  await renderToString(app)
  return state
}
function mountComponent(component, router = { push: async () => {} }) {
  const node = () => ({ children: [], parent: null })
  const renderer = createRenderer({
    createElement: node, createText: node, createComment: node,
    setText() {}, setElementText() {}, patchProp() {},
    insert(child, parent) { parent.children.push(child); child.parent = parent },
    remove(child) { child.parent?.children.splice(child.parent.children.indexOf(child), 1) },
    parentNode: (child) => child.parent, nextSibling: () => null,
  })
  let state
  const app = renderer.createApp({ setup() {
    state = component.setup({}, { expose() {} })
    return () => h('div')
  } })
  app.provide(ssrContextKey, { modules: new Set() })
  app.provide(routeLocationKey, { query: {} })
  app.provide(routerKey, router)
  app.mount(node())
  return { state, unmount: () => app.unmount() }
}
const flush = () => new Promise((resolve) => setImmediate(resolve))
async function tableHtml(item, user) {
  return renderToString(createSSRApp(TicketTable, {
    items: [item], user, engineers: [{ id: 2, fullName: 'Инженер 1' }], engineersReady: true,
  }))
}
function restore(name, descriptor) {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor)
  else delete globalThis[name]
}

before(async () => {
  const storage = new Map()
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  } })
  const window = new EventTarget()
  window.location = { search: '' }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window })
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envDir: false,
    publicDir: false, plugins: [vue()], server: { middlewareMode: true, hmr: false, watch: null },
  })
  session = await server.ssrLoadModule('/src/auth/session.js')
  store = await server.ssrLoadModule('/src/ticketsStore.js')
  api = await server.ssrLoadModule('/src/api/tickets.js')
  references = await server.ssrLoadModule('/src/api/references.js')
  TicketTable = (await server.ssrLoadModule('/src/components/TicketTable.vue')).default
  TicketList = (await server.ssrLoadModule('/src/pages/TicketList.vue')).default
  TicketNew = (await server.ssrLoadModule('/src/pages/TicketNew.vue')).default
})
beforeEach(() => { session.clearSession(); signIn(); globalThis.fetch = async () => reply([]) })
after(async () => {
  await server?.close()
  globalThis.fetch = originalFetch
  restore('window', originalWindow)
  restore('sessionStorage', originalStorage)
})

test('API uses status query, separate PATCH paths and server reference endpoints', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return reply([]) }
  await api.getTickets('InProgress')
  await api.assignTicket(17, 2)
  await api.changeTicketStatus(17, 'InProgress')
  await references.getEquipment()
  await references.getEngineers()
  assert.deepEqual(calls.map((call) => call.url), [
    'http://localhost:5000/api/support-tickets?status=InProgress',
    'http://localhost:5000/api/support-tickets/17/assignee',
    'http://localhost:5000/api/support-tickets/17/status',
    'http://localhost:5000/api/equipment',
    'http://localhost:5000/api/users?role=Engineer',
  ])
  assert.equal(calls[1].options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[1].options.body), { assigneeUserId: 2 })
  assert.deepEqual(JSON.parse(calls[2].options.body), { status: 'InProgress' })
  assert.ok(calls.every((call) => call.options.headers.Authorization === 'Bearer test-session-1'))
})

test('UI displays ticket ID, number, actual assignee and only dispatcher actions', async () => {
  const html = await tableHtml({ ...ticket, assigneeUserId: 2, assigneeFullName: 'Инженер 1' }, dispatcher)
  assert.match(html, /ID заявки: 17/)
  assert.match(html, /SUP-2026-0017/)
  assert.match(html, /Инженер 1/)
  assert.match(html, />Переназначить<\/button>/)
  assert.match(html, />Отменить<\/button>/)
  assert.doesNotMatch(html, />Взять в работу<\/button>|>Завершить<\/button>/)
})

test('engineer can start only own New and close only own InProgress in UI', async () => {
  const own = { ...ticket, assigneeUserId: 2, assigneeFullName: 'Инженер 1' }
  const fresh = await tableHtml(own, engineer)
  assert.match(fresh, />Взять в работу<\/button>/)
  assert.doesNotMatch(fresh, /<select|>Назначить<\/button>|>Отменить<\/button>|>Завершить<\/button>/)
  const working = await tableHtml({ ...own, status: 'InProgress' }, engineer)
  assert.match(working, />Завершить<\/button>/)
  assert.doesNotMatch(working, />Взять в работу<\/button>/)
  const foreign = await tableHtml({ ...own, assigneeUserId: 3 }, engineer)
  assert.doesNotMatch(foreign, /<button|<select/)
})

test('Closed and Cancelled offer no actions for either role', async () => {
  for (const status of ['Closed', 'Cancelled']) {
    for (const user of [dispatcher, engineer]) {
      const html = await tableHtml({ ...ticket, status, assigneeUserId: 2 }, user)
      assert.doesNotMatch(html, /<button|<select/)
    }
  }
})

test('latest status-filter request wins when responses arrive out of order', async () => {
  const state = await componentState(TicketList)
  const pending = []
  globalThis.fetch = (url) => { const response = deferred(); pending.push({ url, ...response }); return response.promise }
  state.filterStatus.value = 'New'
  const first = state.loadTickets()
  state.filterStatus.value = 'Closed'
  const second = state.loadTickets()
  pending[1].resolve(reply([{ ...ticket, id: 18, status: 'Closed' }]))
  await second
  pending[0].resolve(reply([ticket]))
  await first
  assert.equal(state.screen.value, 'data')
  assert.deepEqual(store.items.value.map((item) => item.id), [18])
})

test('equipment loader handles empty, error, retry and uses API IDs in form validation', async () => {
  const state = await componentState(TicketNew)
  await state.loadEquipment()
  assert.equal(state.equipmentState.value, 'empty')
  globalThis.fetch = async () => { throw new Error('offline') }
  await state.loadEquipment()
  assert.equal(state.equipmentState.value, 'error')
  assert.equal(state.equipmentError.value, 'Нет связи с сервером.')
  globalThis.fetch = async () => reply([equipmentRow])
  await state.loadEquipment()
  assert.equal(state.equipmentState.value, 'data')
  assert.deepEqual(state.validate({ title: 'Новая тема', description: 'Достаточное описание проблемы', equipmentId: 42 }), {})
  assert.ok(state.validate({ title: 'Новая тема', description: 'Достаточное описание проблемы', equipmentId: 7 }).equipmentId)
})

test('reference response from an old session cannot fill the equipment form', async () => {
  const state = await componentState(TicketNew)
  const pending = deferred()
  globalThis.fetch = () => pending.promise
  const loading = state.loadEquipment()
  signIn(engineer)
  pending.resolve(reply([equipmentRow]))
  await loading
  assert.deepEqual(state.equipment.value, [])
  assert.equal(state.equipmentState.value, 'loading')
})

test('engineer reference loader is not requested by engineer; stale dispatcher response is ignored', async () => {
  const state = await componentState(TicketList)
  const pending = deferred()
  let calls = 0
  globalThis.fetch = () => { calls++; return pending.promise }
  const loading = state.loadEngineers()
  signIn(engineer)
  await state.loadEngineers()
  pending.resolve(reply([{ id: 2, fullName: 'Инженер 1' }]))
  await loading
  assert.equal(calls, 1)
  assert.deepEqual(state.engineers.value, [])
})

test('form prevents a second POST while the first is pending', async () => {
  const pushes = []
  const state = await componentState(TicketNew, { push: async (path) => { pushes.push(path) } })
  globalThis.fetch = async () => reply([equipmentRow])
  await state.loadEquipment()
  state.form.value = { title: 'Новая тема', equipmentId: 42, description: 'Достаточное описание проблемы' }
  const pending = deferred()
  let posts = 0
  globalThis.fetch = () => { posts++; return pending.promise }
  const first = state.onCreate()
  const second = state.onCreate()
  assert.equal(state.submitting.value, true)
  pending.resolve(reply(ticket, 201))
  await Promise.all([first, second])
  assert.equal(posts, 1)
  assert.deepEqual(pushes, ['/'])
  assert.equal(state.submitting.value, false)
})

test('late form POST after logout does not redirect or repopulate the session', async () => {
  const pushes = []
  const state = await componentState(TicketNew, { push: async (path) => { pushes.push(path) } })
  globalThis.fetch = async () => reply([equipmentRow])
  await state.loadEquipment()
  state.form.value = { title: 'Новая тема', equipmentId: 42, description: 'Достаточное описание проблемы' }
  const pending = deferred()
  globalThis.fetch = () => pending.promise
  const creating = state.onCreate()
  session.clearSession()
  pending.resolve(reply(ticket, 201))
  await creating
  assert.deepEqual(pushes, [])
  assert.deepEqual(store.items.value, [])
  assert.equal(session.authUser.value, null)
})

test('duplicate assignment is blocked and list is updated from the real PATCH and subsequent GET responses', async () => {
  const state = await componentState(TicketList)
  store.items.value = [ticket]
  const updated = { ...ticket, assigneeUserId: 2, assigneeFullName: 'Инженер 1' }
  const pending = deferred()
  const calls = []
  globalThis.fetch = (url, options) => {
    calls.push(options.method)
    return options.method === 'PATCH' ? pending.promise : Promise.resolve(reply([updated]))
  }
  const first = state.saveAction(ticket, 'assign', 2)
  const second = state.saveAction(ticket, 'assign', 2)
  assert.deepEqual(store.items.value, [ticket])
  pending.resolve(reply(updated))
  await Promise.all([first, second])
  assert.deepEqual(calls, ['PATCH', 'GET'])
  assert.equal(store.items.value[0].assigneeUserId, 2)
  assert.equal(store.items.value[0].status, 'New')
  assert.match(state.notice.value, /назначен Инженер 1/)
  assert.deepEqual(state.busyIds.value, [])
})

test('late assignment response cannot overwrite another employee list', async () => {
  const state = await componentState(TicketList)
  store.items.value = [ticket]
  const pending = deferred()
  let calls = 0
  globalThis.fetch = () => { calls++; return pending.promise }
  const saving = state.saveAction(ticket, 'assign', 2)
  signIn(engineer)
  store.items.value = [{ ...ticket, id: 88, assigneeUserId: 2 }]
  pending.resolve(reply({ ...ticket, assigneeUserId: 2, assigneeFullName: 'Инженер 1' }))
  await saving
  assert.deepEqual(store.items.value.map((item) => item.id), [88])
  assert.equal(calls, 1)
  assert.equal(state.notice.value, '')
})

test('403 keeps session and original row; 409 reloads server state and shows its message', async () => {
  const state = await componentState(TicketList)
  store.items.value = [ticket]
  globalThis.fetch = async () => reply({ title: 'Forbidden' }, 403)
  await state.saveAction(ticket, 'assign', 2)
  assert.equal(session.authUser.value.id, 1)
  assert.deepEqual(store.items.value, [ticket])
  assert.equal(state.actionErrors.value[17], 'Недостаточно прав для этого действия.')
  const current = { ...ticket, status: 'InProgress', assigneeUserId: 2 }
  globalThis.fetch = async (url, options) => options.method === 'PATCH'
    ? reply({ title: 'Заявка уже в работе.' }, 409) : reply([current])
  await state.saveAction(ticket, 'assign', 2)
  assert.equal(store.items.value[0].status, 'InProgress')
  assert.equal(state.actionErrors.value[17], 'Заявка уже в работе.')
})

test('engineer cannot invoke dispatcher or foreign-ticket actions through component handlers', async () => {
  signIn(engineer)
  const state = await componentState(TicketList)
  let calls = 0
  globalThis.fetch = async () => { calls++; return reply(ticket) }
  await state.saveAction({ ...ticket, assigneeUserId: 2 }, 'assign', 3)
  await state.saveAction({ ...ticket, assigneeUserId: 2 }, 'status', 'Cancelled')
  await state.saveAction({ ...ticket, assigneeUserId: 3 }, 'status', 'InProgress')
  assert.equal(calls, 0)
})

test('unmounted list cannot replace the new page with its late GET response', async () => {
  for (const status of [200, 500]) {
    signIn(engineer)
    const responses = []
    globalThis.fetch = () => { const response = deferred(); responses.push(response); return response.promise }
    const oldPage = mountComponent(TicketList)
    oldPage.unmount()
    const newPage = mountComponent(TicketList)
    responses[1].resolve(reply([{ ...ticket, id: 200, assigneeUserId: 2 }]))
    await flush()
    assert.deepEqual(store.items.value.map((item) => item.id), [200])
    responses[0].resolve(reply(status === 200 ? [ticket] : { title: 'Late failure' }, status))
    await flush()
    assert.deepEqual(store.items.value.map((item) => item.id), [200])
    assert.equal(newPage.state.screen.value, 'data')
    assert.equal(oldPage.state.errorMessage.value, '')
    newPage.unmount()
  }
})

test('unmounted list ignores late PATCH success and conflict without reloading the new page', async () => {
  for (const status of [200, 409]) {
    signIn(dispatcher)
    const patch = deferred()
    let page = 'old'
    let listCalls = 0
    globalThis.fetch = (url, options) => {
      if (options.method === 'PATCH') return patch.promise
      if (String(url).includes('/api/users')) return Promise.resolve(reply([{ id: 2, fullName: 'Инженер 1' }]))
      listCalls++
      return Promise.resolve(reply([{ ...ticket, id: page === 'old' ? 17 : 200 }]))
    }
    const oldPage = mountComponent(TicketList)
    await flush()
    const saving = oldPage.state.saveAction(ticket, 'assign', 2)
    oldPage.unmount()
    page = 'new'
    const newPage = mountComponent(TicketList)
    await flush()
    const callsBefore = listCalls
    patch.resolve(reply(status === 200 ? { ...ticket, assigneeUserId: 2 } : { title: 'Late conflict' }, status))
    await saving
    assert.deepEqual(store.items.value.map((item) => item.id), [200])
    assert.equal(listCalls, callsBefore)
    assert.equal(oldPage.state.notice.value, '')
    assert.deepEqual(oldPage.state.actionErrors.value, { 17: '' })
    newPage.unmount()
  }
})

test('late form submission after unmount cannot redirect a new page in the same session', async () => {
  const pushes = []
  const post = deferred()
  globalThis.fetch = (url, options) => options.method === 'POST' ? post.promise : Promise.resolve(reply([equipmentRow]))
  const formPage = mountComponent(TicketNew, { push: async (path) => pushes.push(path) })
  await flush()
  formPage.state.form.value = { title: 'Новая тема', equipmentId: 42, description: 'Достаточное описание проблемы' }
  const submitting = formPage.state.onCreate()
  formPage.unmount()
  post.resolve(reply(ticket, 201))
  await submitting
  assert.deepEqual(pushes, [])
})
