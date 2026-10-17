<script setup>
import TicketTable from '../components/TicketTable.vue'
import { items } from '../ticketsStore.js'
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

    <TicketTable :items="items" />
  </section>
</template>
