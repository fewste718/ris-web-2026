<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createTicket } from '../api/tickets.js'
import { getEquipment } from '../api/references.js'
import { getSessionGeneration } from '../auth/session.js'

const router = useRouter()
const titleInput = ref(null)
const equipmentInput = ref(null)
const descriptionInput = ref(null)
const emptyForm = () => ({ title: '', equipmentId: 0, description: '' })
const form = ref(emptyForm())
const errors = ref({})
const submitting = ref(false)
const requestError = ref('')
const equipment = ref([])
const equipmentState = ref('loading')
const equipmentError = ref('')
let equipmentVersion = 0
let disposed = false

onBeforeUnmount(() => { disposed = true; equipmentVersion++ })

async function loadEquipment() {
  if (disposed) return
  const generation = getSessionGeneration()
  const version = ++equipmentVersion
  equipmentState.value = 'loading'
  equipmentError.value = ''
  try {
    const loaded = await getEquipment()
    if (disposed || getSessionGeneration() !== generation || version !== equipmentVersion) return
    equipment.value = loaded
    equipmentState.value = loaded.length ? 'data' : 'empty'
  } catch (error) {
    if (disposed || getSessionGeneration() !== generation || version !== equipmentVersion) return
    equipmentError.value = error.message
    equipmentState.value = 'error'
  }
}

function validate(values) {
  const result = {}
  if (values.title.length < 5 || values.title.length > 80) {
    result.title = 'Тема: от 5 до 80 символов.'
  }
  if (!Number.isInteger(values.equipmentId) || values.equipmentId <= 0
    || !equipment.value.some((item) => item.id === values.equipmentId)) {
    result.equipmentId = 'Выберите оборудование из списка.'
  }
  if (values.description.length < 10 || values.description.length > 500) {
    result.description = 'Описание: от 10 до 500 символов.'
  }
  return result
}

async function onCreate() {
  if (disposed || submitting.value || equipmentState.value !== 'data') return
  const generation = getSessionGeneration()

  const values = {
    title: form.value.title.trim(),
    equipmentId: form.value.equipmentId,
    description: form.value.description.trim(),
  }
  errors.value = validate(values)
  requestError.value = ''
  if (Object.keys(errors.value).length) {
    await nextTick()
    if (disposed || getSessionGeneration() !== generation) return
    const invalidInput = errors.value.title ? titleInput
      : errors.value.equipmentId ? equipmentInput : descriptionInput
    invalidInput.value?.focus()
    return
  }

  submitting.value = true
  try {
    await createTicket(values)
    if (disposed || getSessionGeneration() !== generation) return
    errors.value = {}
    form.value = emptyForm()
    await router.push('/')
  } catch (error) {
    if (disposed || getSessionGeneration() !== generation) return
    requestError.value = error.message
    errors.value = error.errors ?? {}
  } finally {
    if (!disposed && getSessionGeneration() === generation) submitting.value = false
  }
}

onMounted(() => {
  loadEquipment()
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
        <select id="equipmentId" ref="equipmentInput" v-model.number="form.equipmentId" name="equipmentId" required :disabled="submitting || equipmentState !== 'data'" :aria-invalid="Boolean(errors.equipmentId)" :aria-describedby="errors.equipmentId ? 'equipment-error' : undefined">
          <option :value="0" disabled>Выберите оборудование</option>
          <option v-for="item in equipment" :key="item.id" :value="item.id">{{ item.name }} · {{ item.clientName }} · № {{ item.id }}</option>
        </select>
        <p v-if="equipmentState === 'loading'" class="field-help" role="status">Загружаем оборудование…</p>
        <p v-else-if="equipmentState === 'empty'" class="field-help" role="status">В справочнике пока нет оборудования.</p>
        <div v-else-if="equipmentState === 'error'" class="field-error" role="alert"><p>Не удалось загрузить оборудование. {{ equipmentError }}</p><button type="button" class="button button-secondary" @click="loadEquipment">Повторить загрузку оборудования</button></div>
        <p v-if="errors.equipmentId" id="equipment-error" class="field-error" role="alert">{{ errors.equipmentId }}</p>
      </div>
      <div class="field">
        <label for="description">Описание проблемы</label>
        <textarea id="description" ref="descriptionInput" v-model="form.description" name="description" rows="5" required :aria-invalid="Boolean(errors.description)" :aria-describedby="errors.description ? 'description-help description-error' : 'description-help'" placeholder="Что произошло и при каких обстоятельствах?"></textarea>
        <span id="description-help" class="field-help">От 10 до 500 символов</span>
        <p v-if="errors.description" id="description-error" class="field-error" role="alert">{{ errors.description }}</p>
      </div>
      <p v-if="requestError" class="request-error" role="alert">{{ requestError }}</p>
      <div class="form-actions">
        <button class="button button-primary" type="submit" :disabled="submitting || equipmentState !== 'data'">{{ submitting ? 'Создаём…' : 'Создать заявку' }}</button>
        <router-link class="button button-secondary" to="/">К списку</router-link>
      </div>
    </form>
  </section>
</template>

<style scoped>
.field-error { margin: 7px 0 0; color: #a12e27; font-size: 13px; line-height: 1.5; }
.request-error { margin: 23px 0 0; color: #a12e27; font-size: 14px; line-height: 1.5; }
[aria-invalid="true"] { border-color: #a12e27; }
.button:disabled { opacity: 0.65; cursor: default; }
</style>
