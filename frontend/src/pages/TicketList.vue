<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import TicketTable from '../components/TicketTable.vue'
import { items } from '../ticketsStore.js'
import { getTickets } from '../api/tickets.js'
import { authUser, getSessionGeneration } from '../auth/session.js'

const route = useRoute()
const screen = ref('loading')
const errorMessage = ref('')

async function loadTickets() {
  const generation = getSessionGeneration()
  screen.value = 'loading'
  errorMessage.value = ''
  try {
    const loaded = await getTickets()
    if (getSessionGeneration() !== generation) return
    items.value = loaded
    screen.value = items.value.length ? 'data' : 'empty'
  } catch (error) {
    if (getSessionGeneration() !== generation) return
    errorMessage.value = error.message
    screen.value = 'error'
  }
}

onMounted(loadTickets)
</script>

<template>
  <section aria-labelledby="list-heading">
    <div class="page-heading">
      <div>
        <p class="eyebrow">Обращения клиентов</p>
        <h1 id="list-heading">Заявки технической поддержки</h1>
        <p class="page-description">Обращения по обслуживаемому оборудованию и их текущий статус.</p>
      </div>
      <router-link v-if="authUser?.role === 'Dispatcher'" class="button button-primary" to="/new">Создать заявку</router-link>
    </div>

    <p v-if="route.query.access === 'denied'" class="access-notice" role="alert">Создание заявок доступно только диспетчеру.</p>
    <div v-if="screen === 'loading'" class="panel state-panel" role="status">Загрузка…</div>
    <div v-else-if="screen === 'empty'" class="panel state-panel" role="status">Заявок пока нет.</div>
    <TicketTable v-else-if="screen === 'data'" :items="items" />
    <div v-else class="panel state-panel" role="alert">
      <p>{{ errorMessage }}</p>
      <button class="button button-secondary" type="button" @click="loadTickets">Повторить загрузку</button>
    </div>
  </section>
</template>

<style scoped>
.state-panel { padding: 30px; color: #596b82; }
.state-panel p { margin: 0 0 18px; color: #a12e27; }
.access-notice { margin: 0 0 20px; color: #a12e27; font-size: 14px; }
</style>
