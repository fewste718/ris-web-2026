<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { equipment } from '../equipment.js'
import { addItem } from '../ticketsStore.js'

const router = useRouter()
const titleInput = ref(null)
const equipmentInput = ref(null)
const descriptionInput = ref(null)
const emptyForm = () => ({ title: '', equipmentId: 0, description: '' })
const form = ref(emptyForm())
const errors = ref({})
const submitting = ref(false)

function validate(values) {
  const result = {}
  if (values.title.length < 5 || values.title.length > 80) {
    result.title = 'Тема: от 5 до 80 символов.'
  }
  if (!Number.isInteger(values.equipmentId) || values.equipmentId <= 0
    || !equipment.some((item) => item.id === values.equipmentId)) {
    result.equipmentId = 'Выберите оборудование из списка.'
  }
  if (values.description.length < 10 || values.description.length > 500) {
    result.description = 'Описание: от 10 до 500 символов.'
  }
  return result
}

async function onCreate() {
  if (submitting.value) return

  const values = {
    title: form.value.title.trim(),
    equipmentId: form.value.equipmentId,
    description: form.value.description.trim(),
  }
  errors.value = validate(values)
  if (Object.keys(errors.value).length) {
    await nextTick()
    const invalidInput = errors.value.title ? titleInput
      : errors.value.equipmentId ? equipmentInput : descriptionInput
    invalidInput.value?.focus()
    return
  }

  submitting.value = true
  addItem(values)
  errors.value = {}
  form.value = emptyForm()
  await router.push('/')
}

onMounted(() => {
  titleInput.value?.focus()
})
</script>

<template>
  <section class="form-page" aria-labelledby="new-heading">
    <p class="eyebrow">Обращения клиентов</p>
    <h1 id="new-heading">Новая заявка</h1>
    <p class="page-description">Укажите оборудование клиента и опишите проблему.</p>

    <form class="panel form-panel" novalidate @submit.prevent="onCreate">
      <div class="field">
        <label for="title">Тема обращения</label>
        <input id="title" ref="titleInput" v-model="form.title" name="title" type="text" required autofocus :aria-invalid="Boolean(errors.title)" :aria-describedby="errors.title ? 'title-help title-error' : 'title-help'" placeholder="Например, не печатает сетевой принтер">
        <span id="title-help" class="field-help">От 5 до 80 символов</span>
        <p v-if="errors.title" id="title-error" class="field-error" role="alert">{{ errors.title }}</p>
      </div>
      <div class="field">
        <label for="equipmentId">Оборудование</label>
        <select id="equipmentId" ref="equipmentInput" v-model.number="form.equipmentId" name="equipmentId" required :aria-invalid="Boolean(errors.equipmentId)" :aria-describedby="errors.equipmentId ? 'equipment-error' : undefined">
          <option :value="0" disabled>Выберите оборудование</option>
          <option v-for="item in equipment" :key="item.id" :value="item.id">{{ item.name }} · {{ item.clientName }} · № {{ item.id }}</option>
        </select>
        <p v-if="errors.equipmentId" id="equipment-error" class="field-error" role="alert">{{ errors.equipmentId }}</p>
      </div>
      <div class="field">
        <label for="description">Описание проблемы</label>
        <textarea id="description" ref="descriptionInput" v-model="form.description" name="description" rows="5" required :aria-invalid="Boolean(errors.description)" :aria-describedby="errors.description ? 'description-help description-error' : 'description-help'" placeholder="Что произошло и при каких обстоятельствах?"></textarea>
        <span id="description-help" class="field-help">От 10 до 500 символов</span>
        <p v-if="errors.description" id="description-error" class="field-error" role="alert">{{ errors.description }}</p>
      </div>
      <p class="demo-note">Заявки хранятся в памяти до обновления страницы.</p>
      <div class="form-actions">
        <button class="button button-primary" type="submit" :disabled="submitting">Создать заявку</button>
        <router-link class="button button-secondary" to="/">К списку</router-link>
      </div>
    </form>
  </section>
</template>

<style scoped>
.field-error { margin: 7px 0 0; color: #a12e27; font-size: 13px; line-height: 1.5; }
[aria-invalid="true"] { border-color: #a12e27; }
.button:disabled { opacity: 0.65; cursor: default; }
</style>
