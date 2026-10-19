import { mockCreateTicket, mockGetTickets } from './mockTickets.js'

const baseUrl = import.meta.env.VITE_API_BASE_URL
// Параметры используются только для воспроизведения отказов при разработке.
const demo = import.meta.env.DEV ? new URLSearchParams(window.location.search) : new URLSearchParams()
const USE_MOCK = demo.get('api') !== 'real'
const mockOptions = { empty: demo.get('mock') === 'empty', force500: demo.get('mock') === '500' }

export class ApiError extends Error {
  constructor(message, status = null, errors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

async function request(method, body) {
  let response
  let data
  if (USE_MOCK && !import.meta.env.DEV) {
    const result = method === 'GET'
      ? await mockGetTickets(mockOptions) : await mockCreateTicket(body, mockOptions)
    response = result
    data = result.data
  } else {
    const options = new URLSearchParams()
    if (USE_MOCK && mockOptions.empty) options.set('empty', '1')
    if (USE_MOCK && mockOptions.force500) options.set('force500', '1')
    const query = options.size ? `?${options}` : ''
    const url = USE_MOCK ? `/__mock/api/support-tickets${query}`
      : `${baseUrl.replace(/\/$/, '')}/api/support-tickets`
    try {
      response = await fetch(url, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch {
      throw new ApiError('Нет связи с сервером.')
    }
    try {
      data = await response.json()
    } catch {
      throw new ApiError(response.ok ? 'Сервер вернул некорректный ответ.'
        : response.status === 400 ? 'Проверьте поля.' : 'Сервер не смог обработать запрос.', response.status)
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status === 400 ? 'Проверьте поля.'
      : response.status >= 500 ? 'Сервер не смог обработать запрос.'
        : 'Не удалось выполнить запрос.', response.status, data?.errors)
  }
  return data
}

export const getTickets = () => request('GET')
export const createTicket = (body) => request('POST', body)
