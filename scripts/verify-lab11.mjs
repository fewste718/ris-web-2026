import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Только учебные учётки из README. Запуск создаёт три заявки; существующие данные не удаляет.
const baseUrl = (process.argv[2] ?? 'http://localhost:5000').replace(/\/$/, '')
const evidence = fileURLToPath(new URL('../docs/reports/evidence/lab-11/', import.meta.url))
const accounts = {
  dispatcher: { login: 'dispatcher1', password: 'Lab11-Dispatcher!2026', id: 1, role: 'Dispatcher' },
  engineer1: { login: 'engineer1', password: 'Lab11-Engineer1!2026', id: 2, role: 'Engineer' },
  engineer2: { login: 'engineer2', password: 'Lab11-Engineer2!2026', id: 3, role: 'Engineer' },
}
const tokens = {}
const requests = []
const checks = []
const created = {}
const resource = '/api/support-tickets'
const xss = '<script>alert(1)</script>'
const valid = { title: 'HTTP проверка прав доступа', equipmentId: 7, description: xss }

function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) =>
      [key, /password|token|authorization/i.test(key) ? '[скрыто]' : redact(item)]))
  }
  return value
}

function check(name, action) {
  try {
    action()
    checks.push({ name, passed: true })
  } catch (error) {
    checks.push({ name, passed: false, error: error.message })
    throw error
  }
}

function noPasswordFields(value, path = []) {
  if (Array.isArray(value)) return value.forEach(item => noPasswordFields(item, path))
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const validationField = path.at(-1) === 'errors' && key.toLowerCase() === 'password'
        && Array.isArray(item) && item.every(message => typeof message === 'string')
      assert.ok(validationField || !/password|passwordHash/i.test(key), `Ответ содержит закрытое поле ${key}`)
      noPasswordFields(item, [...path, key])
    }
  }
}

async function request(name, method, path, expected, { actor, body, headers = {}, token } = {}) {
  const bearer = token ?? tokens[actor]
  const started = Date.now()
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  })
  const text = await response.text()
  let data = text
  try { data = text ? JSON.parse(text) : null } catch { /* Некоторые 401/405 не имеют JSON-тела. */ }
  requests.push({
    name, method, path, actor: actor ?? 'guest', bearerProvided: Boolean(bearer),
    ...(body === undefined ? {} : { body: redact(body) }),
    headers: redact(headers), expectedStatus: expected, actualStatus: response.status,
    response: redact(data), location: response.headers.get('location'),
    durationMs: Date.now() - started,
  })
  check(name, () => assert.equal(response.status, expected, `${method} ${path}: HTTP ${response.status}, ожидался ${expected}`))
  check(`${name}: пароль и hash не возвращаются`, () => noPasswordFields(data))
  return { data, response }
}

async function get(id) {
  return (await request('Чтение текущего состояния', 'GET', `${resource}/${id}`, 200, { actor: 'dispatcher' })).data
}

async function unchanged(name, id, method, path, status, options) {
  const before = await get(id)
  await request(name, method, path, status, options)
  const after = await get(id)
  check(`${name}: данные не изменились`, () => assert.deepEqual(after, before))
}

function stable(before, after, allowed) {
  const fields = Object.keys(before).filter(key => !allowed.includes(key))
  for (const key of fields) assert.deepEqual(after[key], before[key], `Изменилось поле ${key}`)
}

async function create(name, equipmentId = 7) {
  const body = { ...valid, equipmentId }
  const { data, response } = await request(name, 'POST', resource, 201, {
    actor: 'dispatcher', body, headers: { 'X-User-Id': '3' },
  })
  check(`${name}: серверные поля и автор из входа`, () => {
    assert.ok(Number.isInteger(data.id) && data.id > 0)
    assert.match(data.number, /^SUP-\d{4}-\d{4,}$/)
    assert.equal(data.createdByUserId, 1)
    assert.equal(data.status, 'New')
    assert.equal(data.assigneeUserId, null)
    assert.equal(data.description, xss)
    assert.equal(data.clientId, equipmentId === 7 ? 3 : 4)
    assert.ok(response.headers.get('location')?.endsWith(`${resource}/${data.id}`))
  })
  return data
}

try {
  await request('Гость не создаёт', 'POST', resource, 401, { body: valid })
  await request('Один X-User-Id не является входом', 'POST', resource, 401, { body: valid, headers: { 'X-User-Id': '1' } })
  await request('Гость не читает список', 'GET', resource, 401)
  await request('Гость не читает профиль', 'GET', '/api/auth/me', 401)
  await request('Пустые поля входа', 'POST', '/api/auth/login', 400, { body: {} })
  const wrong = await request('Неверный пароль', 'POST', '/api/auth/login', 401, {
    body: { login: 'dispatcher1', password: 'wrong-password' },
  })
  const missing = await request('Неизвестный логин', 'POST', '/api/auth/login', 401, {
    body: { login: 'unknown-lab11-user', password: 'wrong-password' },
  })
  check('Ошибка не раскрывает существование логина', () => assert.equal(missing.data?.title, wrong.data?.title))
  await request('Логин не склеивается с SQL', 'POST', '/api/auth/login', 401, {
    body: { login: "dispatcher1' OR 1=1 --", password: 'wrong-password' },
  })
  for (const [actor, account] of Object.entries(accounts)) {
    const { data } = await request(`Вход: ${actor}`, 'POST', '/api/auth/login', 200, {
      body: { login: account.login, password: account.password },
    })
    check(`Токен и профиль: ${actor}`, () => {
      assert.equal(typeof data.accessToken, 'string')
      assert.equal(data.accessToken.split('.').length, 3)
      assert.ok(Date.parse(data.expiresAt) > Date.now())
      assert.deepEqual(data.user, { id: account.id, login: account.login,
        fullName: actor === 'dispatcher' ? 'Диспетчер 1' : actor === 'engineer1' ? 'Инженер 1' : 'Инженер 2', role: account.role })
    })
    tokens[actor] = data.accessToken
    const profile = await request(`Профиль: ${actor}`, 'GET', '/api/auth/me', 200, { actor, headers: { 'X-User-Id': '1' } })
    check(`Профиль определяется токеном: ${actor}`, () => assert.deepEqual(profile.data, data.user))
  }
  await request('Испорченный токен', 'GET', resource, 401, { token: 'not-a-jwt' })
  const parts = tokens.dispatcher.split('.')
  parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1)
  await request('Подменённая подпись JWT', 'GET', resource, 401, { token: parts.join('.') })
  const baseline = (await request('Исходный список диспетчера', 'GET', resource, 200, { actor: 'dispatcher' })).data
  await request('Инженер не создаёт даже с X-User-Id=1', 'POST', resource, 403, {
    actor: 'engineer1', body: valid, headers: { 'X-User-Id': '1' },
  })
  await request('Короткая тема', 'POST', resource, 400, { actor: 'dispatcher', body: { ...valid, title: 'abcd' } })
  await request('Длинная тема', 'POST', resource, 400, { actor: 'dispatcher', body: { ...valid, title: 'a'.repeat(81) } })
  await request('Короткое описание', 'POST', resource, 400, { actor: 'dispatcher', body: { ...valid, description: 'a'.repeat(9) } })
  await request('Длинное описание', 'POST', resource, 400, { actor: 'dispatcher', body: { ...valid, description: 'a'.repeat(501) } })
  await request('equipmentId не JSON-строка', 'POST', resource, 400, { actor: 'dispatcher', body: { ...valid, equipmentId: '7' } })
  await request('Неизвестное оборудование', 'POST', resource, 400, { actor: 'dispatcher', body: { ...valid, equipmentId: 2147483647 } })
  const afterInvalid = (await request('Список после отказов создания', 'GET', resource, 200, { actor: 'dispatcher' })).data
  check('Отказы создания не добавили заявки', () => assert.deepEqual(afterInvalid, baseline))

  let first = await create('Создание заявки для инженера 1')
  created.closedTicketId = first.id
  const path = `${resource}/${first.id}`
  await request('Гость не читает объект', 'GET', path, 401)
  await unchanged('Гость не назначает', first.id, 'PATCH', `${path}/assignee`, 401, { body: { assigneeUserId: 2 } })
  await unchanged('Гость не меняет статус', first.id, 'PATCH', `${path}/status`, 401, { body: { status: 'Cancelled' } })
  await request('Неназначенная заявка недоступна инженеру', 'GET', path, 403, { actor: 'engineer1' })
  await unchanged('Инженер не берёт неназначенную заявку', first.id, 'PATCH', `${path}/status`, 403,
    { actor: 'engineer1', body: { status: 'InProgress' } })
  await unchanged('Инженер не назначает себя', first.id, 'PATCH', `${path}/assignee`, 403,
    { actor: 'engineer1', body: { assigneeUserId: 2 } })
  await unchanged('Диспетчер не берёт заявку в работу', first.id, 'PATCH', `${path}/status`, 403,
    { actor: 'dispatcher', body: { status: 'InProgress' } })
  await unchanged('Назначить диспетчера нельзя', first.id, 'PATCH', `${path}/assignee`, 400,
    { actor: 'dispatcher', body: { assigneeUserId: 1 } })
  await unchanged('Неизвестный статус', first.id, 'PATCH', `${path}/status`, 400,
    { actor: 'dispatcher', body: { status: 'Done' } })
  const assigned = (await request('Диспетчер назначает инженера 1', 'PATCH', `${path}/assignee`, 200,
    { actor: 'dispatcher', body: { assigneeUserId: 2 } })).data
  check('Назначение меняет только исполнителя', () => {
    stable(first, assigned, ['assigneeUserId', 'assigneeFullName'])
    assert.equal(assigned.assigneeUserId, 2)
    assert.equal(assigned.status, 'New')
  })
  first = assigned
  await request('Назначенный инженер читает свою заявку', 'GET', path, 200, { actor: 'engineer1' })
  await request('Другой инженер не читает заявку', 'GET', path, 403, { actor: 'engineer2' })
  await unchanged('Другой инженер не двигает заявку с X-User-Id=2', first.id, 'PATCH', `${path}/status`, 403,
    { actor: 'engineer2', body: { status: 'InProgress' }, headers: { 'X-User-Id': '2' } })
  await unchanged('Назначенный инженер не отменяет', first.id, 'PATCH', `${path}/status`, 403,
    { actor: 'engineer1', body: { status: 'Cancelled' } })
  await unchanged('Назначенный инженер не назначает другого', first.id, 'PATCH', `${path}/assignee`, 403,
    { actor: 'engineer1', body: { assigneeUserId: 3 } })
  await unchanged('Нельзя закрыть New в обход работы', first.id, 'PATCH', `${path}/status`, 409,
    { actor: 'engineer1', body: { status: 'Closed' } })
  const working = (await request('Назначенный инженер берёт в работу', 'PATCH', `${path}/status`, 200,
    { actor: 'engineer1', body: { status: 'InProgress' } })).data
  check('Взятие в работу меняет только статус', () => {
    stable(first, working, ['status'])
    assert.equal(working.status, 'InProgress')
  })
  await unchanged('Переназначение после начала работы', first.id, 'PATCH', `${path}/assignee`, 409,
    { actor: 'dispatcher', body: { assigneeUserId: 3 } })
  await unchanged('Диспетчер не закрывает заявку', first.id, 'PATCH', `${path}/status`, 403,
    { actor: 'dispatcher', body: { status: 'Closed' } })
  await unchanged('Чужой инженер не закрывает заявку', first.id, 'PATCH', `${path}/status`, 403,
    { actor: 'engineer2', body: { status: 'Closed' } })
  const closed = (await request('Назначенный инженер закрывает', 'PATCH', `${path}/status`, 200,
    { actor: 'engineer1', body: { status: 'Closed' } })).data
  check('Закрытие меняет только статус', () => { stable(working, closed, ['status']); assert.equal(closed.status, 'Closed') })
  await unchanged('Closed нельзя открыть снова', first.id, 'PATCH', `${path}/status`, 409,
    { actor: 'engineer1', body: { status: 'InProgress' } })
  await unchanged('Closed нельзя отменить', first.id, 'PATCH', `${path}/status`, 409,
    { actor: 'dispatcher', body: { status: 'Cancelled' } })
  await unchanged('Closed нельзя переназначить', first.id, 'PATCH', `${path}/assignee`, 409,
    { actor: 'dispatcher', body: { assigneeUserId: 3 } })

  const second = await create('Создание заявки для отмены New', 8)
  created.cancelledNewTicketId = second.id
  const secondPath = `${resource}/${second.id}`
  const secondAssigned = (await request('Назначить инженера 2', 'PATCH', `${secondPath}/assignee`, 200,
    { actor: 'dispatcher', body: { assigneeUserId: 3 } })).data
  const cancelledNew = (await request('Диспетчер отменяет New', 'PATCH', `${secondPath}/status`, 200,
    { actor: 'dispatcher', body: { status: 'Cancelled' } })).data
  check('Отмена New сохраняет данные и исполнителя', () => {
    stable(secondAssigned, cancelledNew, ['status'])
    assert.equal(cancelledNew.status, 'Cancelled')
    assert.equal(cancelledNew.assigneeUserId, 3)
  })
  await unchanged('Cancelled нельзя начать', second.id, 'PATCH', `${secondPath}/status`, 409,
    { actor: 'engineer2', body: { status: 'InProgress' } })
  await unchanged('Cancelled нельзя переназначить', second.id, 'PATCH', `${secondPath}/assignee`, 409,
    { actor: 'dispatcher', body: { assigneeUserId: 2 } })

  const third = await create('Создание заявки для отмены InProgress')
  created.cancelledWorkingTicketId = third.id
  const thirdPath = `${resource}/${third.id}`
  await request('Назначить инженера перед работой', 'PATCH', `${thirdPath}/assignee`, 200,
    { actor: 'dispatcher', body: { assigneeUserId: 2 } })
  const thirdWorking = (await request('Взять третью заявку в работу', 'PATCH', `${thirdPath}/status`, 200,
    { actor: 'engineer1', body: { status: 'InProgress' } })).data
  const cancelledWorking = (await request('Диспетчер отменяет InProgress', 'PATCH', `${thirdPath}/status`, 200,
    { actor: 'dispatcher', body: { status: 'Cancelled' } })).data
  check('Отмена InProgress сохраняет данные и исполнителя', () => {
    stable(thirdWorking, cancelledWorking, ['status'])
    assert.equal(cancelledWorking.assigneeUserId, 2)
    assert.equal(cancelledWorking.status, 'Cancelled')
  })
  await unchanged('Cancelled нельзя закрыть', third.id, 'PATCH', `${thirdPath}/status`, 409,
    { actor: 'engineer1', body: { status: 'Closed' } })

  const all = (await request('Общий список диспетчера', 'GET', resource, 200, { actor: 'dispatcher' })).data
  check('В общем списке сохранены все три созданные заявки', () => {
    for (const id of Object.values(created)) assert.ok(all.some(item => item.id === id))
    assert.equal(all.find(item => item.id === first.id).description, xss)
  })
  for (const actor of ['engineer1', 'engineer2']) {
    const list = (await request(`Список ${actor}: только свои`, 'GET', resource, 200, { actor })).data
    check(`Видимость ${actor} не расширена`, () => {
      assert.ok(list.every(item => item.assigneeUserId === accounts[actor].id))
      assert.ok(list.some(item => item.id === (actor === 'engineer1' ? first.id : second.id)))
      assert.ok(!list.some(item => item.id === (actor === 'engineer1' ? second.id : first.id)))
    })
    const filtered = (await request(`Фильтр Cancelled: ${actor}`, 'GET', `${resource}?status=Cancelled`, 200, { actor })).data
    check(`Фильтр сохраняет права ${actor}`, () => {
      assert.ok(filtered.every(item => item.status === 'Cancelled' && item.assigneeUserId === accounts[actor].id))
      assert.ok(filtered.some(item => item.id === (actor === 'engineer1' ? third.id : second.id)))
    })
  }
  await request('Неверный фильтр', 'GET', `${resource}?status=Done`, 400, { actor: 'dispatcher' })
  await request('Отсутствующий id', 'GET', `${resource}/2147483647`, 404, { actor: 'dispatcher' })
  await unchanged('DELETE отсутствует', first.id, 'DELETE', path, 405, { actor: 'dispatcher' })
  await unchanged('Общий PATCH отсутствует', first.id, 'PATCH', path, 405,
    { actor: 'dispatcher', body: { status: 'New' } })
} catch (error) {
  if (!checks.some(item => !item.passed)) checks.push({ name: 'Выполнение прогона', passed: false, error: error.message })
} finally {
  await mkdir(evidence, { recursive: true })
  const summary = {
    checkedAt: new Date().toISOString(), baseUrl,
    status: checks.some(item => !item.passed) ? 'failed' : 'passed',
    requests: requests.length, assertions: checks.length,
    failures: checks.filter(item => !item.passed).length,
    created, checks,
    note: 'JWT, Authorization и значения паролей удалены до записи доказательств. Проверка HTML здесь подтверждает только сохранение строки; выполнение в Vue проверяется отдельно в браузере.',
  }
  await writeFile(`${evidence}/http-requests.json`, JSON.stringify(requests, null, 2) + '\n')
  await writeFile(`${evidence}/http-summary.json`, JSON.stringify(summary, null, 2) + '\n')
  console.log(JSON.stringify({ status: summary.status, requests: summary.requests, assertions: summary.assertions,
    failures: summary.failures, created: summary.created }, null, 2))
  for (const failure of checks.filter(item => !item.passed)) console.error(`${failure.name}: ${failure.error}`)
  if (summary.failures) process.exitCode = 1
}
