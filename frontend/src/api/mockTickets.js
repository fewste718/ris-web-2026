import { equipment } from '../equipment.js'

const delay = () => new Promise((resolve) => setTimeout(resolve, 500))
const reply = (status, data) => ({ ok: status >= 200 && status < 300, status, data })

function ticket(id, number, title, equipmentId, description, status = 'New') {
  const selected = equipment.find((item) => item.id === equipmentId)
  return {
    id, number, title, equipmentId, description, status,
    equipmentName: selected.name,
    clientId: selected.clientId,
    clientName: selected.clientName,
    createdByUserId: 1,
    assigneeUserId: status === 'InProgress' ? 2 : null,
    assigneeFullName: status === 'InProgress' ? 'Инженер 1' : null,
    createdAt: new Date().toISOString(),
  }
}

const records = [
  ticket(17, 'SUP-2026-0001', 'Не печатает сетевой принтер', 7,
    'После отправки документа принтер не начинает печать.'),
  ticket(18, 'SUP-2026-0002', 'Недоступна общая папка на сервере', 8,
    'При открытии общей папки появляется ошибка доступа.', 'InProgress'),
]
let nextId = 19
let nextNumber = 3

export async function mockGetTickets({ empty = false, force500 = false } = {}) {
  await delay()
  if (force500) return reply(500, { message: 'Сервер не смог обработать запрос.' })
  return reply(200, structuredClone(empty ? [] : records))
}

export async function mockCreateTicket(body, { force500 = false } = {}) {
  await delay()
  if (force500) return reply(500, { message: 'Сервер не смог обработать запрос.' })

  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const equipmentId = body?.equipmentId
  const errors = {}
  if (title.length < 5 || title.length > 80) errors.title = 'Тема: от 5 до 80 символов.'
  if (!Number.isInteger(equipmentId) || equipmentId <= 0
    || !equipment.some((item) => item.id === equipmentId)) {
    errors.equipmentId = 'Выберите оборудование из списка.'
  }
  if (description.length < 10 || description.length > 500) {
    errors.description = 'Описание: от 10 до 500 символов.'
  }
  if (Object.keys(errors).length) return reply(400, { message: 'Проверьте поля.', errors })

  const created = ticket(nextId++, `SUP-2026-${String(nextNumber++).padStart(4, '0')}`,
    title, equipmentId, description)
  records.push(created)
  return reply(201, structuredClone(created))
}
