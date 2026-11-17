import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// HTTP-проверка справочников и сквозного сценария. Каждый запуск создаёт три
// учебные заявки, существующие записи не изменяет и не удаляет.
// UI, SQL и перезапуск API проверяются отдельно по одному ID из отчёта ЛР12.
const baseUrl = (process.argv[2] ?? 'http://localhost:5000').replace(/\/$/, '')
const evidence = fileURLToPath(new URL('../docs/reports/evidence/lab-12/', import.meta.url))
const resource = '/api/support-tickets'
const accounts = {
  dispatcher: { login: 'dispatcher1', password: 'Lab11-Dispatcher!2026', id: 1, role: 'Dispatcher' },
  engineer1: { login: 'engineer1', password: 'Lab11-Engineer1!2026', id: 2, role: 'Engineer' },
  engineer2: { login: 'engineer2', password: 'Lab11-Engineer2!2026', id: 3, role: 'Engineer' },
}
const tokens = {}
const requests = []
const checks = []
const created = {}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key, /password|token|authorization/i.test(key) ? '[скрыто]' : redact(item),
    ]))
  }
  if (typeof value === 'string') return safeMessage(value)
  return value
}

function safeMessage(value) {
  let message = String(value)
  for (const secret of [...Object.values(tokens), ...Object.values(accounts).map(item => item.password)]) {
    if (secret) message = message.split(secret).join('[скрыто]')
  }
  return message.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[скрыто]')
}

function check(name, assertion) {
  try {
    assertion()
    checks.push({ name, passed: true })
  } catch (error) {
    checks.push({ name, passed: false, error: safeMessage(error.message) })
    throw error
  }
}

function assertNoPassword(value) {
  if (Array.isArray(value)) return value.forEach(assertNoPassword)
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      assert.ok(!/password/i.test(key), `Закрытое поле в ответе: ${key}`)
      assertNoPassword(item)
    }
  }
}

async function request(name, method, path, expectedStatus, { actor, body, headers = {} } = {}) {
  const token = tokens[actor]
  const started = Date.now()
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  })
  const text = await response.text()
  let data = text || null
  try { data = text ? JSON.parse(text) : null } catch { /* Возможен пустой ответ middleware. */ }
  requests.push({
    name, method, path, actor: actor ?? 'guest', bearerProvided: Boolean(token),
    ...(body === undefined ? {} : { body: redact(body) }),
    headers: redact(headers), expectedStatus, actualStatus: response.status,
    response: redact(data), location: response.headers.get('location'),
    durationMs: Date.now() - started,
  })
  check(name, () => assert.equal(response.status, expectedStatus, `${method} ${path}: неверный HTTP-код`))
  check(`${name}: хеш и пароль не возвращаются`, () => assertNoPassword(data))
  return { data, response }
}

function assertSameExcept(before, after, allowed) {
  for (const key of Object.keys(before)) {
    if (!allowed.includes(key)) assert.deepEqual(after[key], before[key], `Изменилось поле ${key}`)
  }
}

async function rejectWithoutChange(name, before, method, path, expectedStatus, options) {
  await request(name, method, path, expectedStatus, options)
  const after = (await request(`${name}: чтение после отказа`, 'GET', `${resource}/${before.id}`, 200,
    { actor: 'dispatcher' })).data
  check(`${name}: запись не изменилась`, () => assert.deepEqual(after, before))
}

async function create(name, equipment, title) {
  const body = {
    title, equipmentId: equipment.id,
    description: 'Проверка создания, назначения и работы с заявкой через настоящее API.',
  }
  const { data, response } = await request(name, 'POST', resource, 201, { actor: 'dispatcher', body })
  check(`${name}: серверные поля и связи`, () => {
    assert.ok(Number.isInteger(data.id) && data.id > 0)
    assert.match(data.number, /^SUP-\d{4}-\d{4,}$/)
    assert.equal(data.title, body.title)
    assert.equal(data.description, body.description)
    assert.equal(data.equipmentId, equipment.id)
    assert.equal(data.equipmentName, equipment.name)
    assert.equal(data.clientId, equipment.clientId)
    assert.equal(data.clientName, equipment.clientName)
    assert.equal(data.createdByUserId, accounts.dispatcher.id)
    assert.equal(data.status, 'New')
    assert.equal(data.assigneeUserId, null)
    assert.ok(response.headers.get('location')?.endsWith(`${resource}/${data.id}`))
  })
  return data
}

async function assign(name, before, engineer) {
  const { data } = await request(name, 'PATCH', `${resource}/${before.id}/assignee`, 200, {
    actor: 'dispatcher', body: { assigneeUserId: engineer.id },
  })
  check(`${name}: исполнитель изменён отдельно от статуса`, () => {
    assert.equal(data.assigneeUserId, engineer.id)
    assert.equal(data.assigneeFullName, engineer.fullName)
    assert.equal(data.status, 'New')
    assertSameExcept(before, data, ['assigneeUserId', 'assigneeFullName'])
  })
  return data
}

async function status(name, before, actor, target) {
  const { data } = await request(name, 'PATCH', `${resource}/${before.id}/status`, 200, {
    actor, body: { status: target },
  })
  check(`${name}: изменён только статус`, () => {
    assert.equal(data.status, target)
    assertSameExcept(before, data, ['status'])
  })
  return data
}

try {
  for (const path of ['/api/equipment', '/api/users?role=Engineer']) {
    await request(`Гость: ${path}`, 'GET', path, 401)
  }
  for (const [actor, account] of Object.entries(accounts)) {
    const { data } = await request(`Вход ${actor}`, 'POST', '/api/auth/login', 200,
      { body: { login: account.login, password: account.password } })
    check(`Вход ${actor}: токен и нужная роль`, () => {
      assert.ok(typeof data.accessToken === 'string' && data.accessToken.length > 100)
      assert.ok(Date.parse(data.expiresAt) > Date.now())
      assert.equal(data.user.id, account.id)
      assert.equal(data.user.role, account.role)
    })
    tokens[actor] = data.accessToken
  }
  for (const actor of ['engineer1', 'engineer2']) {
    for (const path of ['/api/equipment', '/api/users?role=Engineer']) {
      await request(`${actor}: справочник доступен только диспетчеру`, 'GET', path, 403, { actor })
    }
  }
  const { data: equipment, response: equipmentResponse } = await request('Оборудование из API', 'GET',
    '/api/equipment', 200, { actor: 'dispatcher', headers: { Origin: 'http://localhost:5173' } })
  check('Оборудование: DTO, связи и порядок', () => {
    assert.ok(Array.isArray(equipment) && equipment.length > 0)
    const ids = equipment.map(item => item.id)
    assert.deepEqual(ids, [...new Set(ids)].sort((a, b) => a - b))
    for (const item of equipment) {
      assert.deepEqual(Object.keys(item).sort(), ['clientId', 'clientName', 'id', 'name'])
      assert.ok(Number.isInteger(item.id) && item.id > 0)
      assert.ok(Number.isInteger(item.clientId) && item.clientId > 0)
      assert.ok(typeof item.name === 'string' && item.name.trim())
      assert.ok(typeof item.clientName === 'string' && item.clientName.trim())
    }
  })
  check('CORS разрешает клиенту читать справочник', () => {
    assert.equal(equipmentResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  })
  const engineers = (await request('Инженеры из API', 'GET', '/api/users?role=Engineer', 200,
    { actor: 'dispatcher' })).data
  check('Инженеры: только ID и имя, стабильный порядок', () => {
    assert.ok(Array.isArray(engineers) && engineers.length >= 2)
    const ids = engineers.map(item => item.id)
    assert.deepEqual(ids, [...new Set(ids)].sort((a, b) => a - b))
    for (const item of engineers) {
      assert.deepEqual(Object.keys(item).sort(), ['fullName', 'id'])
      assert.ok(Number.isInteger(item.id) && item.id > 0)
      assert.ok(typeof item.fullName === 'string' && item.fullName.trim())
    }
    assert.ok(!ids.includes(accounts.dispatcher.id))
  })
  const defaultEngineers = (await request('Инженеры — значение role по умолчанию', 'GET', '/api/users', 200,
    { actor: 'dispatcher' })).data
  check('Справочник без role совпадает с role=Engineer', () => assert.deepEqual(defaultEngineers, engineers))
  for (const [name, query] of [
    ['Dispatcher', 'role=Dispatcher'], ['Unknown', 'role=Unknown'], ['engineer', 'role=engineer'],
    ['пустая строка', 'role='], ['пробел', 'role=%20'],
    ['повторённое значение', 'role=Engineer&role=Engineer'],
    ['смешанные значения', 'role=Engineer&role=Dispatcher'],
  ]) {
    await request(`Отказ неподдерживаемого role: ${name}`, 'GET', `/api/users?${query}`, 400,
      { actor: 'dispatcher' })
  }
  const firstEngineer = engineers.find(item => item.id === accounts.engineer1.id)
  const secondEngineer = engineers.find(item => item.id === accounts.engineer2.id)
  check('Оба учебных инженера доступны для назначения', () => {
    assert.ok(firstEngineer && secondEngineer)
  })

  let main = await create('Создание основной заявки', equipment[0], 'HTTP проверка сквозного сценария ЛР12')
  created.inProgressTicket = { id: main.id, number: main.number }
  await rejectWithoutChange('Инженер не назначает себя', main, 'PATCH', `${resource}/${main.id}/assignee`, 403,
    { actor: 'engineer1', body: { assigneeUserId: firstEngineer.id } })
  await rejectWithoutChange('Диспетчер не назначается исполнителем', main, 'PATCH', `${resource}/${main.id}/assignee`, 400,
    { actor: 'dispatcher', body: { assigneeUserId: accounts.dispatcher.id } })
  main = await assign('Назначение второго инженера', main, secondEngineer)
  main = await assign('Переназначение новой заявки первому инженеру', main, firstEngineer)
  await request('Прежний исполнитель не читает переназначенную заявку', 'GET', `${resource}/${main.id}`, 403,
    { actor: 'engineer2' })
  await rejectWithoutChange('Чужой инженер не переводит в работу', main, 'PATCH', `${resource}/${main.id}/status`, 403,
    { actor: 'engineer2', body: { status: 'InProgress' } })
  await rejectWithoutChange('Диспетчер не переводит в работу', main, 'PATCH', `${resource}/${main.id}/status`, 403,
    { actor: 'dispatcher', body: { status: 'InProgress' } })
  await rejectWithoutChange('Инженер не пропускает работу', main, 'PATCH', `${resource}/${main.id}/status`, 409,
    { actor: 'engineer1', body: { status: 'Closed' } })
  main = await status('Назначенный инженер переводит в работу', main, 'engineer1', 'InProgress')
  await rejectWithoutChange('Переназначение после начала работы запрещено', main, 'PATCH', `${resource}/${main.id}/assignee`, 409,
    { actor: 'dispatcher', body: { assigneeUserId: secondEngineer.id } })
  const readByEngineer = (await request('Инженер читает ту же заявку по ID', 'GET', `${resource}/${main.id}`, 200,
    { actor: 'engineer1' })).data
  check('ID, номер, исполнитель и данные совпали после перехода', () => assert.deepEqual(readByEngineer, main))

  let closed = await create('Создание заявки для проверки завершения', equipment[0], 'HTTP проверка завершения ЛР12')
  closed = await assign('Назначение перед завершением', closed, firstEngineer)
  closed = await status('Начало работы перед завершением', closed, 'engineer1', 'InProgress')
  closed = await status('Завершение назначенным инженером', closed, 'engineer1', 'Closed')
  created.closedTicket = { id: closed.id, number: closed.number }
  await rejectWithoutChange('Closed нельзя снова взять в работу', closed, 'PATCH', `${resource}/${closed.id}/status`, 409,
    { actor: 'engineer1', body: { status: 'InProgress' } })
  await rejectWithoutChange('Closed нельзя переназначить', closed, 'PATCH', `${resource}/${closed.id}/assignee`, 409,
    { actor: 'dispatcher', body: { assigneeUserId: secondEngineer.id } })

  let cancelled = await create('Создание заявки для проверки отмены', equipment.at(-1), 'HTTP проверка отмены ЛР12')
  cancelled = await assign('Назначение перед отменой', cancelled, secondEngineer)
  await rejectWithoutChange('Назначенный инженер не отменяет заявку', cancelled, 'PATCH', `${resource}/${cancelled.id}/status`, 403,
    { actor: 'engineer2', body: { status: 'Cancelled' } })
  cancelled = await status('Диспетчер отменяет заявку', cancelled, 'dispatcher', 'Cancelled')
  created.cancelledTicket = { id: cancelled.id, number: cancelled.number }
  check('Отмена сохранила исполнителя', () => assert.equal(cancelled.assigneeUserId, secondEngineer.id))
  await rejectWithoutChange('Cancelled нельзя взять в работу', cancelled, 'PATCH', `${resource}/${cancelled.id}/status`, 409,
    { actor: 'engineer2', body: { status: 'InProgress' } })
  await rejectWithoutChange('Cancelled нельзя переназначить', cancelled, 'PATCH', `${resource}/${cancelled.id}/assignee`, 409,
    { actor: 'dispatcher', body: { assigneeUserId: firstEngineer.id } })

  for (const actor of ['dispatcher', 'engineer1', 'engineer2']) {
    const all = (await request(`Реальный список: ${actor}`, 'GET', resource, 200, { actor })).data
    check(`Реальный список ${actor} сохраняет видимость`, () => {
      assert.ok(Array.isArray(all))
      if (actor === 'dispatcher') assert.ok([main, closed, cancelled].every(ticket => all.some(item => item.id === ticket.id)))
      else assert.ok(all.every(item => item.assigneeUserId === accounts[actor].id))
    })
    for (const filter of ['New', 'InProgress', 'Closed', 'Cancelled']) {
      const filtered = (await request(`Фильтр ${filter}: ${actor}`, 'GET', `${resource}?status=${filter}`, 200,
        { actor })).data
      check(`Фильтр ${filter}: ${actor}, статус и видимость сохранены`, () => {
        assert.ok(Array.isArray(filtered))
        assert.ok(filtered.every(item => item.status === filter
          && (actor === 'dispatcher' || item.assigneeUserId === accounts[actor].id)))
        // Остальные вкладки могут создавать свои заявки во время прогона.
        // Для полного сравнения используем только три строки текущего запуска.
        const ownIds = new Set([main.id, closed.id, cancelled.id])
        assert.deepEqual(filtered.filter(item => ownIds.has(item.id)),
          all.filter(item => ownIds.has(item.id) && item.status === filter))
      })
    }
  }
  await request('Неизвестный статус фильтра', 'GET', `${resource}?status=Done`, 400, { actor: 'dispatcher' })
} catch (error) {
  if (!checks.some(item => !item.passed)) {
    checks.push({ name: 'Выполнение прогона', passed: false, error: safeMessage(error.message) })
  }
} finally {
  await mkdir(evidence, { recursive: true })
  const summary = {
    checkedAt: new Date().toISOString(), baseUrl,
    status: checks.some(item => !item.passed) ? 'failed' : 'passed',
    requests: requests.length, assertions: checks.length,
    failures: checks.filter(item => !item.passed).length,
    created, checks,
    note: 'Проверка HTTP API на заполненной БД, без её очистки. Проверки UI, SQL и перезапуска API выполняются отдельно. Токены и значения паролей удалены до сохранения результатов.',
  }
  await writeFile(`${evidence}/http-requests.json`, JSON.stringify(requests, null, 2) + '\n')
  await writeFile(`${evidence}/http-summary.json`, JSON.stringify(summary, null, 2) + '\n')
  console.log(JSON.stringify({ status: summary.status, requests: summary.requests, assertions: summary.assertions,
    failures: summary.failures, created: summary.created }, null, 2))
  for (const failure of checks.filter(item => !item.passed)) console.error(`${failure.name}: ${failure.error}`)
  if (summary.failures) process.exitCode = 1
}
