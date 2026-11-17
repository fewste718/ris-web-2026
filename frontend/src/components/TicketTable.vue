<script setup>
import { reactive } from 'vue'
import { statusLabel, ticketActions } from '../domain/tickets.js'

defineProps({
  items: { type: Array, required: true },
  user: { type: Object, default: null },
  engineers: { type: Array, default: () => [] },
  engineersReady: { type: Boolean, default: false },
  busyIds: { type: Array, default: () => [] },
  errors: { type: Object, default: () => ({}) },
  actionsEnabled: { type: Boolean, default: true },
})
defineEmits(['assign', 'status'])
const selectedAssignees = reactive({})
const selected = (item) => selectedAssignees[item.id] ?? item.assigneeUserId ?? ''
</script>

<template>
  <div class="panel">
    <div class="panel-heading"><h2>Реестр обращений</h2><span class="sample-label">Записей: {{ items.length }}</span></div>
    <table>
      <caption class="visually-hidden">Список заявок технической поддержки, сначала новые</caption>
      <colgroup><col class="number-column"><col class="title-column"><col class="equipment-column"><col class="assignee-column"><col class="status-column"><col class="actions-column"></colgroup>
      <thead><tr><th scope="col">Номер / ID</th><th scope="col">Обращение</th><th scope="col">Оборудование / клиент</th><th scope="col">Исполнитель</th><th scope="col">Статус</th><th scope="col">Действия</th></tr></thead>
      <tbody>
        <tr v-for="item in items" :key="item.id" :data-ticket-id="item.id">
          <td data-label="Номер / ID"><span class="ticket-number">{{ item.number }}</span><span class="ticket-id">ID заявки: {{ item.id }}</span></td>
          <td data-label="Обращение" class="ticket-title">{{ item.title }}<p class="ticket-description">{{ item.description }}</p></td>
          <td data-label="Оборудование / клиент">{{ item.equipmentName }}<span class="equipment-id">Оборудование № {{ item.equipmentId }}</span><span class="client-name">{{ item.clientName }}</span></td>
          <td data-label="Исполнитель">{{ item.assigneeFullName || 'Не назначен' }}</td>
          <td data-label="Статус"><span class="status" :class="`status-${item.status}`">{{ statusLabel(item.status) }}</span></td>
          <td data-label="Действия" class="actions-cell">
            <div v-if="actionsEnabled" class="ticket-actions">
              <template v-if="ticketActions(item, user).assign">
                <label class="visually-hidden" :for="`engineer-${item.id}`">Инженер для заявки {{ item.number }}</label>
                <select :id="`engineer-${item.id}`" :value="selected(item)" :disabled="busyIds.includes(item.id) || !engineersReady || !engineers.length" @change="selectedAssignees[item.id] = Number($event.target.value)">
                  <option value="" disabled>Выберите инженера</option>
                  <option v-for="engineer in engineers" :key="engineer.id" :value="engineer.id">{{ engineer.fullName }}</option>
                </select>
                <button class="button button-secondary action-button" type="button" :disabled="busyIds.includes(item.id) || !engineersReady || !selected(item) || selected(item) === item.assigneeUserId" @click="$emit('assign', item, selected(item))">{{ item.assigneeUserId ? 'Переназначить' : 'Назначить' }}</button>
              </template>
              <button v-if="ticketActions(item, user).start" class="button button-primary action-button" type="button" :disabled="busyIds.includes(item.id)" @click="$emit('status', item, 'InProgress')">Взять в работу</button>
              <button v-if="ticketActions(item, user).close" class="button button-primary action-button" type="button" :disabled="busyIds.includes(item.id)" @click="$emit('status', item, 'Closed')">Завершить</button>
              <button v-if="ticketActions(item, user).cancel" class="button button-secondary action-button cancel-button" type="button" :disabled="busyIds.includes(item.id)" @click="$emit('status', item, 'Cancelled')">Отменить</button>
            </div>
            <span v-if="busyIds.includes(item.id)" class="action-progress" role="status">Сохраняем…</span>
            <p v-if="errors[item.id]" class="action-error" role="alert">{{ errors[item.id] }}</p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 20px; }
h2 { margin: 0; font-size: 16px; font-weight: 600; }
.sample-label { color: #64748b; font-size: 12px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; text-align: left; font-size: 13px; }
.number-column { width: 15%; } .title-column { width: 27%; } .equipment-column { width: 17%; } .assignee-column { width: 12%; } .status-column { width: 13%; } .actions-column { width: 16%; }
th { background: #f8fafc; border-top: 1px solid #e7ecf2; border-bottom: 1px solid #e7ecf2; padding: 14px 12px; color: #586b84; font-size: 12px; font-weight: 600; }
td { padding: 20px 12px; line-height: 1.5; vertical-align: top; overflow-wrap: anywhere; }
tbody tr + tr { border-top: 1px solid #edf0f5; }
.ticket-number { color: #2458a6; font-weight: 600; }
.ticket-id, .equipment-id { display: block; margin-top: 5px; color: #6a7a8f; font-size: 12px; }
.client-name { display: block; margin-top: 8px; }
.ticket-title { font-weight: 500; }
.ticket-description { margin: 8px 0 0; color: #596b82; font-size: 13px; font-weight: 400; white-space: pre-wrap; overflow-wrap: anywhere; }
.status { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.status::before { content: ''; flex: 0 0 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-New { color: #28704c; background: #eaf5ee; } .status-InProgress { color: #2458a6; background: #eaf0fb; } .status-Closed { color: #46566d; background: #edf0f4; } .status-Cancelled { color: #98413b; background: #faeeec; }
.ticket-actions { display: flex; flex-direction: column; gap: 8px; }
.ticket-actions select { min-width: 0; padding: 8px 6px; font-size: 12px; }
.action-button { width: 100%; min-height: 36px; padding: 7px 8px; font-size: 12px; }
.cancel-button { color: #98413b; }
.action-progress { display: block; margin-top: 8px; color: #596b82; font-size: 12px; }
.action-error { margin: 8px 0 0; color: #a12e27; font-size: 12px; }
button:disabled, select:disabled { opacity: 0.6; cursor: default; }
.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 760px) {
  table, tbody { display: block; }
  colgroup, thead { display: none; }
  tr { display: grid; grid-template-columns: 1fr 1fr; padding: 10px; }
  td { display: block; padding: 10px; }
  td::before { content: attr(data-label); display: block; margin-bottom: 5px; color: #586b84; font-size: 11px; font-weight: 600; }
  .ticket-title, .actions-cell { grid-column: 1 / -1; }
  .ticket-actions { flex-direction: row; flex-wrap: wrap; }
  .ticket-actions select, .action-button { flex: 1 1 130px; width: auto; }
}
</style>
