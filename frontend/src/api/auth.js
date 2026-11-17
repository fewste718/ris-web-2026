import { ApiError, requestJson } from './client.js'
import { accessToken, expiresAt, expireSession, getSessionGeneration, isUser, setSession, updateUser } from '../auth/session.js'

let verifiedToken = ''
let pending = null
let pendingToken = ''

export async function login(login, password) {
  const generation = getSessionGeneration()
  let session
  try {
    session = await requestJson('/api/auth/login', {
      method: 'POST', body: { login, password }, authenticated: false,
    })
  } catch (error) {
    if (error.status === 401) throw new ApiError('Неверный логин или пароль.', 401)
    throw error
  }
  if (getSessionGeneration() !== generation) throw new ApiError('Сеанс изменён. Повторите вход.', 401)
  if (typeof session?.accessToken !== 'string' || !session.accessToken
    || !(Date.parse(session.expiresAt) > Date.now()) || !isUser(session.user)) {
    throw new ApiError('Сервер вернул некорректный ответ входа.')
  }
  setSession(session)
  verifiedToken = session.accessToken
  return session.user
}

export async function ensureSession() {
  const generation = getSessionGeneration()
  const token = accessToken.value
  if (!token) return false
  if (!(Date.parse(expiresAt.value) > Date.now())) {
    expireSession()
    return false
  }
  if (verifiedToken === token) return true
  if (pendingToken === token && pending) return pending
  pendingToken = token
  const check = requestJson('/api/auth/me').then((user) => {
    if (!isUser(user)) throw new ApiError('Сервер вернул некорректные данные сотрудника.')
    if (getSessionGeneration() !== generation) return false
    updateUser(user)
    verifiedToken = token
    return true
  }).catch((error) => {
    if (error.status === 401) return false
    throw error
  }).finally(() => {
    if (pendingToken === token) {
      pending = null
      pendingToken = ''
    }
  })
  pending = check
  return check
}
