import { accessToken, expiresAt, expireSession, getSessionGeneration } from '../auth/session.js'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status = null, errors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export function responseError(status, data) {
  const fields = Object.fromEntries(Object.entries(data?.errors ?? {}).map(([key, value]) => [
    key.charAt(0).toLowerCase() + key.slice(1), Array.isArray(value) ? value.join(' ') : value,
  ]))
  const message = status === 401 ? 'Сеанс завершён. Войдите снова.'
    : status === 403 ? 'Недостаточно прав для этого действия.'
      : status >= 500 ? 'Сервер не смог обработать запрос.'
        : status === 400 ? 'Проверьте поля.'
          : data?.title || data?.message || 'Не удалось выполнить запрос.'
  return new ApiError(message, status, fields)
}

export async function requestJson(path, { method = 'GET', body, authenticated = true, sameOrigin = false } = {}) {
  const generation = getSessionGeneration()
  const token = authenticated ? accessToken.value : ''
  if (authenticated && (!token || !(Date.parse(expiresAt.value) > Date.now()))) {
    expireSession()
    throw responseError(401)
  }
  let response
  try {
    response = await fetch(`${sameOrigin ? '' : baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new ApiError('Нет связи с сервером.')
  }
  // Запрос предыдущего сеанса не должен заполнить список после выхода или смены сотрудника.
  if (authenticated && getSessionGeneration() !== generation) throw responseError(401)

  let data = null
  const text = await response.text()
  // Пока читается тело, пользователь тоже может выйти или войти под другой учёткой.
  // Старый 200 не возвращает данные, а старый 401 не завершает новый сеанс.
  if (authenticated && getSessionGeneration() !== generation) throw responseError(401)
  if (text) {
    try { data = JSON.parse(text) } catch {
      if (response.ok) throw new ApiError('Сервер вернул некорректный ответ.', response.status)
    }
  }
  if (!response.ok) {
    if (response.status === 401 && authenticated) expireSession()
    throw responseError(response.status, data)
  }
  if (response.status !== 204 && data === null) {
    throw new ApiError('Сервер вернул пустой ответ.', response.status)
  }
  return data
}
