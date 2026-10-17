<script setup>
import { onMounted, ref } from 'vue'

const titleInput = ref(null)

const equipment = [
  { id: 7, name: 'Сетевой принтер 01', clientName: 'Клиент А' },
  { id: 8, name: 'Файловый сервер 01', clientName: 'Клиент Б' },
]

onMounted(() => {
  titleInput.value?.focus()
})
</script>

<template>
  <section class="form-page" aria-labelledby="new-heading">
    <p class="eyebrow">Обращения клиентов</p>
    <h1 id="new-heading">Новая заявка</h1>
    <p class="page-description">Укажите оборудование клиента и опишите проблему.</p>

    <form class="panel form-panel" @submit.prevent>
      <div class="field">
        <label for="title">Тема обращения</label>
        <input id="title" ref="titleInput" name="title" type="text" autofocus aria-describedby="title-help" placeholder="Например, не печатает сетевой принтер">
        <span id="title-help" class="field-help">От 5 до 80 символов</span>
      </div>
      <div class="field">
        <label for="equipmentId">Оборудование</label>
        <select id="equipmentId" name="equipmentId">
          <option value="" disabled selected>Выберите оборудование</option>
          <option v-for="item in equipment" :key="item.id" :value="item.id">{{ item.name }} · {{ item.clientName }} · № {{ item.id }}</option>
        </select>
      </div>
      <div class="field">
        <label for="description">Описание проблемы</label>
        <textarea id="description" name="description" rows="5" aria-describedby="description-help" placeholder="Что произошло и при каких обстоятельствах?"></textarea>
        <span id="description-help" class="field-help">От 10 до 500 символов</span>
      </div>
      <p class="demo-note">Демонстрационная форма. Данные не отправляются.</p>
      <div class="form-actions">
        <button class="button button-primary" type="submit">Создать заявку</button>
        <router-link class="button button-secondary" to="/">К списку</router-link>
      </div>
    </form>
  </section>
</template>
