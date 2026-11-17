<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import TicketTable from '../components/TicketTable.vue'
import { items } from '../ticketsStore.js'
import { assignTicket, changeTicketStatus, getTickets, useMock } from '../api/tickets.js'
import { getEngineers } from '../api/references.js'
import { authUser, getSessionGeneration } from '../auth/session.js'
import { statusLabel, ticketActions, ticketStatuses } from '../domain/tickets.js'

const route = useRoute()
const screen = ref('loading')
const errorMessage = ref('')
const filterStatus = ref('')
const engineers = ref([])
const engineersState = ref('loading')
const engineersError = ref('')
const busyIds = ref([])
const actionErrors = ref({})
const notice = ref('')
const visibleItems = computed(() => [...items.value].sort((a, b) => b.id - a.id))
let loadVersion = 0
let engineersVersion = 0
let disposed = false

onBeforeUnmount(() => {
  disposed = true
  loadVersion++
  engineersVersion++
})

async function loadTickets() {
  if (disposed) return
  const generation = getSessionGeneration()
  const version = ++loadVersion
  screen.value = 'loading'
  errorMessage.value = ''
  try {
    const loaded = await getTickets(filterStatus.value)
    if (disposed || getSessionGeneration() !== generation || version !== loadVersion) return
    items.value = loaded
    screen.value = items.value.length ? 'data' : 'empty'
  } catch (error) {
    if (disposed || getSessionGeneration() !== generation || version !== loadVersion) return
    errorMessage.value = error.message
    screen.value = 'error'
  }
}

async function loadEngineers() {
  if (disposed || authUser.value?.role !== 'Dispatcher' || useMock) return
  const generation = getSessionGeneration()
  const version = ++engineersVersion
  engineersState.value = 'loading'
  engineersError.value = ''
  try {
    const loaded = await getEngineers()
    if (disposed || getSessionGeneration() !== generation || version !== engineersVersion) return
    engineers.value = loaded
    engineersState.value = loaded.length ? 'data' : 'empty'
  } catch (error) {
    if (disposed || getSessionGeneration() !== generation || version !== engineersVersion) return
    engineersError.value = error.message
    engineersState.value = 'error'
  }
}

async function saveAction(item, action, value) {
  if (disposed || busyIds.value.includes(item.id)) return
  const allowed = ticketActions(item, authUser.value)
  if (useMock || !(action === 'assign' ? allowed.assign
    : value === 'Cancelled' ? allowed.cancel : value === 'InProgress' ? allowed.start : value === 'Closed' && allowed.close)) return
  const generation = getSessionGeneration()
  busyIds.value = [...busyIds.value, item.id]
  actionErrors.value = { ...actionErrors.value, [item.id]: '' }
  notice.value = ''
  try {
    const updated = action === 'assign' ? await assignTicket(item.id, value) : await changeTicketStatus(item.id, value)
    if (disposed || getSessionGeneration() !== generation) return
    // Старый GET не должен перезаписать подтверждённый сервером результат PATCH.
    loadVersion++
    items.value = items.value.map((ticket) => ticket.id === updated.id ? updated : ticket)
      .filter((ticket) => !filterStatus.value || ticket.status === filterStatus.value)
    notice.value = action === 'assign' ? `Заявка ${updated.number}: назначен ${updated.assigneeFullName}.`
      : `Заявка ${updated.number}: статус «${statusLabel(updated.status)}».`
    await loadTickets()
  } catch (error) {
    if (disposed || getSessionGeneration() !== generation) return
    actionErrors.value = { ...actionErrors.value, [item.id]: error.message }
    if (error.status === 409) await loadTickets()
  } finally {
    if (!disposed && getSessionGeneration() === generation) busyIds.value = busyIds.value.filter((id) => id !== item.id)
  }
}

onMounted(() => { loadTickets(); loadEngineers() })
</script>

<template>
  <section aria-labelledby="list-heading">
    <div class="page-heading">
      <div><p class="eyebrow">Обращения клиентов</p><h1 id="list-heading">Заявки технической поддержки</h1><p class="page-description">Обращения по обслуживаемому оборудованию и их текущий статус.</p></div>
      <router-link v-if="authUser?.role === 'Dispatcher'" class="button button-primary" to="/new">Создать заявку</router-link>
    </div>
    <div class="list-tools">
      <div class="status-filter"><label for="status-filter">Статус заявки</label><select id="status-filter" v-model="filterStatus" @change="loadTickets"><option value="">Все статусы</option><option v-for="status in ticketStatuses" :key="status.value" :value="status.value">{{ status.label }}</option></select></div>
      <button class="button button-secondary refresh-button" type="button" @click="loadTickets">Обновить список</button><span class="sort-note">Сначала новые</span>
    </div>
    <p v-if="route.query.access === 'denied'" class="access-notice" role="alert">Создание заявок доступно только диспетчеру.</p>
    <p v-if="notice" class="success-notice" role="status">{{ notice }}</p>
    <p v-if="useMock" class="reference-notice">Включены учебные данные. Для назначения и статусов откройте обычный адрес без параметров.</p>
    <template v-else-if="authUser?.role === 'Dispatcher'">
      <p v-if="engineersState === 'loading'" class="reference-notice" role="status">Загружаем список инженеров…</p>
      <p v-else-if="engineersState === 'empty'" class="reference-notice" role="status">Инженеров для назначения пока нет.</p>
      <div v-else-if="engineersState === 'error'" class="reference-notice reference-error" role="alert"><p>Не удалось загрузить инженеров. {{ engineersError }}</p><button type="button" class="button button-secondary" @click="loadEngineers">Повторить загрузку инженеров</button></div>
    </template>
    <div v-if="screen === 'loading'" class="panel state-panel" role="status">Загрузка…</div>
    <div v-else-if="screen === 'empty'" class="panel state-panel" role="status">{{ filterStatus ? 'По выбранному статусу заявок нет.' : 'Заявок пока нет.' }}</div>
    <TicketTable v-else-if="screen === 'data'" :items="visibleItems" :user="authUser" :engineers="engineers" :engineers-ready="engineersState === 'data'" :busy-ids="busyIds" :errors="actionErrors" :actions-enabled="!useMock" @assign="(item, id) => saveAction(item, 'assign', id)" @status="(item, status) => saveAction(item, 'status', status)" />
    <div v-else class="panel state-panel" role="alert"><p>{{ errorMessage }}</p><button class="button button-secondary" type="button" @click="loadTickets">Повторить загрузку</button></div>
  </section>
</template>

<style scoped>
.list-tools { display: flex; align-items: flex-end; gap: 14px; margin-bottom: 20px; }
.status-filter { flex: 0 1 230px; } .status-filter label { font-size: 13px; }
.sort-note { align-self: center; margin-left: auto; color: #64748b; font-size: 12px; }
.refresh-button { flex-shrink: 0; }
.state-panel { padding: 30px; color: #596b82; }
.state-panel p { margin: 0 0 18px; color: #a12e27; }
.access-notice, .reference-notice, .success-notice { margin: 0 0 20px; font-size: 14px; line-height: 1.5; }
.access-notice, .reference-error { color: #a12e27; }
.reference-notice { color: #596b82; } .reference-error p { margin-top: 0; }
.success-notice { padding: 14px 18px; border: 1px solid #b9d9c4; border-radius: 8px; color: #28704c; background: #edf7f0; }
@media (max-width: 760px) { .list-tools { flex-wrap: wrap; } .sort-note { margin-left: 0; } }
</style>
