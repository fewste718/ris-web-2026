import { ref } from 'vue'
import { items } from '../ticketsStore.js'

const storageKey = 'mobius.support.session'
let generation = 0

export const getSessionGeneration = () => generation

export function isUser(value) {
  return Number.isInteger(value?.id) && value.id > 0
    && typeof value.login === 'string' && typeof value.fullName === 'string'
    && ['Dispatcher', 'Engineer'].includes(value.role)
}

function readSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey))
    if (typeof saved?.accessToken === 'string' && saved.accessToken
      && Date.parse(saved.expiresAt) > Date.now() && isUser(saved.user)) return saved
    sessionStorage.removeItem(storageKey)
  } catch { /* Если хранилище недоступно, сеанс остаётся только в памяти вкладки. */ }
  return null
}

const saved = readSession()
export const accessToken = ref(saved?.accessToken ?? '')
export const expiresAt = ref(saved?.expiresAt ?? '')
export const authUser = ref(saved?.user ?? null)
export const sessionNotice = ref('')

function persist() {
  try {
    if (accessToken.value) {
      sessionStorage.setItem(storageKey, JSON.stringify({
        accessToken: accessToken.value, expiresAt: expiresAt.value, user: authUser.value,
      }))
    } else sessionStorage.removeItem(storageKey)
  } catch { /* Вход продолжает работать в памяти, без сохранения после F5. */ }
}

export function setSession(session) {
  generation++
  // Данные прошлого сотрудника не должны остаться при смене учётной записи.
  items.value = []
  accessToken.value = session.accessToken
  expiresAt.value = session.expiresAt
  authUser.value = session.user
  sessionNotice.value = ''
  persist()
}

export function updateUser(user) {
  authUser.value = user
  persist()
}

export function clearSession() {
  generation++
  accessToken.value = ''
  expiresAt.value = ''
  authUser.value = null
  items.value = []
  sessionNotice.value = ''
  persist()
}

export function expireSession() {
  clearSession()
  sessionNotice.value = 'Сеанс завершён. Войдите снова.'
  window.dispatchEvent(new Event('session-expired'))
}
