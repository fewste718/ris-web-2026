<script setup>
defineProps({
  items: { type: Array, required: true },
})

const statusLabels = {
  New: 'Новая',
  InProgress: 'В работе',
  Closed: 'Выполнена',
  Cancelled: 'Отменена',
}
</script>

<template>
  <div class="panel">
    <div class="panel-heading">
      <h2>Реестр обращений</h2>
      <span class="sample-label">Тестовые данные</span>
    </div>
    <div class="table-scroll">
      <table>
        <caption class="visually-hidden">Список заявок технической поддержки</caption>
        <thead>
          <tr>
            <th scope="col">Номер</th>
            <th scope="col">Тема обращения</th>
            <th scope="col">Оборудование</th>
            <th scope="col">Клиент</th>
            <th scope="col">Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td class="ticket-number">{{ item.number }}</td>
            <td class="ticket-title">{{ item.title }}</td>
            <td>{{ item.equipmentName }}<span class="equipment-id">№ {{ item.equipmentId }}</span></td>
            <td>{{ item.clientName }}</td>
            <td><span class="status" :class="`status-${item.status}`">{{ statusLabels[item.status] }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 24px; }
h2 { margin: 0; font-size: 16px; font-weight: 600; }
.sample-label { color: #64748b; font-size: 12px; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
th { background: #f8fafc; border-top: 1px solid #e7ecf2; border-bottom: 1px solid #e7ecf2; padding: 14px 20px; color: #586b84; font-size: 12px; font-weight: 600; }
td { padding: 22px 20px; line-height: 1.5; vertical-align: middle; }
tbody tr + tr { border-top: 1px solid #edf0f5; }
.ticket-number { color: #2458a6; white-space: nowrap; font-size: 13px; font-weight: 600; }
.ticket-title { max-width: 280px; font-weight: 500; }
.equipment-id { display: block; margin-top: 4px; color: #6a7a8f; font-size: 12px; }
.status { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 6px; white-space: nowrap; font-size: 12px; font-weight: 600; }
.status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-New { color: #28704c; background: #eaf5ee; }
.status-InProgress { color: #2458a6; background: #eaf0fb; }
.status-Closed { color: #46566d; background: #edf0f4; }
.status-Cancelled { color: #98413b; background: #faeeec; }
.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 760px) {
  table { min-width: 760px; }
}
</style>
