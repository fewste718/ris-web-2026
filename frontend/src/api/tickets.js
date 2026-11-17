import { accessToken, authUser } from '../auth/session.js'
import { ApiError, requestJson, responseError } from './client.js'

export { ApiError } from './client.js'

// Режим задаётся явно при загрузке страницы; обычный запуск использует настоящий API.
const demo = import.meta.env.DEV ? new URLSearchParams(window.location.search) : new URLSearchParams()
export const useMock = import.meta.env.DEV && demo.get('api') === 'mock'

async function request(method, body, status = '') {
  const filter = status ? `?${new URLSearchParams({ status })}` : ''
  if (!useMock) return requestJson(`/api/support-tickets${filter}`, { method, body })

  // Старые примеры ЛР6 доступны только явно в dev; обычные страницы используют API.
  if (!accessToken.value) throw responseError(401)
  if (method === 'POST' && authUser.value?.role !== 'Dispatcher') throw responseError(403)
  const options = new URLSearchParams()
  if (demo.get('mock') === 'empty') options.set('empty', '1')
  if (demo.get('mock') === '500') options.set('force500', '1')
  const query = options.size ? `?${options}` : ''
  const result = await requestJson(`/__mock/api/support-tickets${query}`, { method, body, sameOrigin: true })
  if (method !== 'GET') return result
  return result.filter((item) => (!status || item.status === status)
    && (authUser.value?.role !== 'Engineer' || item.assigneeUserId === authUser.value.id))
}

export const getTickets = (status = '') => request('GET', undefined, status)
export const createTicket = (body) => request('POST', body)

function patch(id, action, body) {
  if (useMock) throw new ApiError('Назначение и смена статуса доступны в обычном режиме с API.', 409)
  return requestJson(`/api/support-tickets/${id}/${action}`, { method: 'PATCH', body })
}

export const assignTicket = (id, assigneeUserId) => patch(id, 'assignee', { assigneeUserId })
export const changeTicketStatus = (id, status) => patch(id, 'status', { status })
