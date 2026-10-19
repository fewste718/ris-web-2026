<script setup>
import { onMounted, ref } from 'vue'
import TicketTable from '../components/TicketTable.vue'
import { items } from '../ticketsStore.js'
import { getTickets } from '../api/tickets.js'

const screen = ref('loading')
const errorMessage = ref('')

async function loadTickets() {
  screen.value = 'loading'
  errorMessage.value = ''
  try {
    items.value = await getTickets()
    screen.value = items.value.length ? 'data' : 'empty'
  } catch (error) {
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
      <router-link class="button button-primary" to="/new">Создать заявку</router-link>
    </div>

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
</style>
