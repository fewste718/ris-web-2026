import { ref } from 'vue'

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
