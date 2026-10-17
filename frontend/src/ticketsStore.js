import { ref } from 'vue'
import { equipment } from './equipment.js'

export const items = ref([
  {
    id: 17,
    number: 'SUP-2026-0001',
    title: 'Не печатает сетевой принтер',
    equipmentId: 7,
    equipmentName: 'Сетевой принтер 01',
    clientName: 'Клиент А',
    status: 'New',
  },
  {
    id: 18,
    number: 'SUP-2026-0002',
    title: 'Недоступна общая папка на сервере',
    equipmentId: 8,
    equipmentName: 'Файловый сервер 01',
    clientName: 'Клиент Б',
    status: 'InProgress',
  },
])

let nextId = Math.max(...items.value.map((item) => item.id)) + 1
let nextNumber = items.value.length + 1

export function addItem({ title, equipmentId, description }) {
  const selectedEquipment = equipment.find((item) => item.id === equipmentId)
  const item = {
    id: nextId++,
    number: `SUP-2026-${String(nextNumber++).padStart(4, '0')}`,
    title,
    equipmentId,
    equipmentName: selectedEquipment.name,
    clientName: selectedEquipment.clientName,
    description,
    status: 'New',
  }

  items.value.push(item)
  return item
}
