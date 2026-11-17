import { accessToken, authUser } from '../auth/session.js'
import { requestJson, responseError } from './client.js'

export { ApiError } from './client.js'

// Режим задаётся явно при загрузке страницы; обычный запуск использует настоящий API.
const demo = import.meta.env.DEV ? new URLSearchParams(window.location.search) : new URLSearchParams()
const useMock = import.meta.env.DEV && demo.get('api') === 'mock'

async function request(method, body) {
  if (!useMock) return requestJson('/api/support-tickets', { method, body })

  // Старые примеры ЛР6 доступны только явно в dev; обычные страницы используют API.
  if (!accessToken.value) throw responseError(401)
  if (method === 'POST' && authUser.value?.role !== 'Dispatcher') throw responseError(403)
  const options = new URLSearchParams()
  if (demo.get('mock') === 'empty') options.set('empty', '1')
  if (demo.get('mock') === '500') options.set('force500', '1')
  const query = options.size ? `?${options}` : ''
  const result = await requestJson(`/__mock/api/support-tickets${query}`, { method, body, sameOrigin: true })
  return method === 'GET' && authUser.value?.role === 'Engineer'
    ? result.filter((item) => item.assigneeUserId === authUser.value.id) : result
}

export const getTickets = () => request('GET')
export const createTicket = (body) => request('POST', body)
