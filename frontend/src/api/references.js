import { ApiError, requestJson } from './client.js'

async function list(path) {
  const rows = await requestJson(path)
  if (!Array.isArray(rows)) throw new ApiError('Сервер вернул некорректный справочник.')
  return rows
}

export const getEquipment = () => list('/api/equipment')
export const getEngineers = () => list('/api/users?role=Engineer')
