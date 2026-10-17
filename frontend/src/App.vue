<script setup>
import { nextTick, ref } from 'vue'

const screen = ref('list')
const titleInput = ref(null)

const equipment = [
  { id: 7, name: 'Сетевой принтер 01', clientName: 'Клиент А' },
  { id: 8, name: 'Файловый сервер 01', clientName: 'Клиент Б' },
]

const items = [
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
]

const statusLabels = {
  New: 'Новая',
  InProgress: 'В работе',
  Closed: 'Выполнена',
  Cancelled: 'Отменена',
}

async function changeScreen(nextScreen) {
  screen.value = nextScreen
  if (nextScreen === 'new') {
    await nextTick()
    titleInput.value?.focus()
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">М</span>
        <div>
          <div class="brand-name">Мобиус Технологии</div>
          <div class="brand-caption">Техническая поддержка</div>
        </div>
      </div>
      <nav class="navigation" aria-label="Основные экраны">
        <button type="button" :aria-pressed="screen === 'list'" @click="changeScreen('list')">Заявки</button>
        <button type="button" :aria-pressed="screen === 'new'" @click="changeScreen('new')">Создать заявку</button>
        <button type="button" :aria-pressed="screen === 'login'" @click="changeScreen('login')">Вход</button>
      </nav>
    </div>
  </header>

  <main class="workspace">
    <section v-if="screen === 'list'" aria-labelledby="list-heading">
      <div class="page-heading">
        <div>
          <p class="eyebrow">Обращения клиентов</p>
          <h1 id="list-heading">Заявки технической поддержки</h1>
          <p class="page-description">Обращения по обслуживаемому оборудованию и их текущий статус.</p>
        </div>
        <button class="button button-primary" type="button" @click="changeScreen('new')">Создать заявку</button>
      </div>

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
    </section>

    <section v-else-if="screen === 'new'" class="form-page" aria-labelledby="new-heading">
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
          <button class="button button-secondary" type="button" @click="changeScreen('list')">К списку</button>
        </div>
      </form>
    </section>

    <section v-else-if="screen === 'login'" class="login-page" aria-labelledby="login-heading">
      <p class="eyebrow">Служба поддержки</p>
      <h1 id="login-heading">Вход в систему</h1>
      <p class="page-description">Для диспетчеров и инженеров технической поддержки.</p>

      <form class="panel form-panel" @submit.prevent>
        <div class="field">
          <label for="login">Логин</label>
          <input id="login" name="login" type="text" autocomplete="username" placeholder="Введите логин">
        </div>
        <div class="field">
          <label for="password">Пароль</label>
          <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Введите пароль">
        </div>
        <p class="demo-note">Демонстрационная форма. Авторизация не выполняется.</p>
        <button class="button button-primary login-submit" type="submit">Войти</button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.app-header { background: #fff; border-bottom: 1px solid #dfe5ed; }
.header-content { max-width: 1240px; min-height: 92px; margin: 0 auto; padding: 18px 30px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.brand { display: flex; align-items: center; gap: 12px; }
.brand-mark { width: 42px; height: 42px; border-radius: 11px; display: grid; place-items: center; background: #2458a6; color: #fff; font-size: 26px; font-weight: 700; }
.brand-name { font-size: 17px; font-weight: 650; }
.brand-caption { margin-top: 3px; color: #5c6d82; font-size: 13px; }
.navigation { display: flex; gap: 6px; }
.navigation button { border: 0; border-radius: 7px; background: transparent; padding: 10px 15px; color: #53637b; cursor: pointer; }
.navigation button:hover { background: #f0f4fa; }
.navigation button[aria-pressed='true'] { color: #1d4f99; background: #eaf0f9; font-weight: 600; }
.workspace { max-width: 1240px; margin: 0 auto; padding: 48px 30px 64px; }
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 30px; }
.eyebrow { margin: 0 0 10px; color: #4e6685; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
h1 { margin: 0; font-size: 29px; line-height: 1.25; font-weight: 650; letter-spacing: -0.02em; }
.page-description { margin: 12px 0 0; color: #596b82; font-size: 15px; line-height: 1.6; }
.panel { background: #fff; border: 1px solid #dfe5ed; border-radius: 12px; overflow: hidden; }
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
.button { display: inline-flex; justify-content: center; align-items: center; min-height: 42px; padding: 10px 18px; border: 1px solid transparent; border-radius: 7px; font-weight: 600; font-size: 14px; cursor: pointer; }
.button-primary { color: #fff; background: #2458a6; }
.button-primary:hover { background: #1d4786; }
.button-secondary { color: #425670; background: #fff; border-color: #d7dfe9; }
.button-secondary:hover { background: #f4f7fb; }
button:focus-visible { outline: 3px solid #7eaae6; outline-offset: 3px; }
.form-page { max-width: 740px; margin: 0 auto; }
.form-panel { margin-top: 28px; padding: 30px; }
.field + .field { margin-top: 23px; }
label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
input, select, textarea { display: block; width: 100%; padding: 11px 13px; border: 1px solid #cbd5e1; border-radius: 6px; color: #172b45; background: #fff; font-size: 14px; line-height: 1.5; }
input:focus, select:focus, textarea:focus { border-color: #467ec9; outline: 3px solid #e0ebfb; }
input::placeholder, textarea::placeholder { color: #748398; }
textarea { min-height: 134px; resize: vertical; }
.field-help { display: block; margin-top: 7px; color: #64748b; font-size: 12px; }
.demo-note { margin: 23px 0 0; color: #64748b; font-size: 12px; line-height: 1.6; }
.form-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.login-page { max-width: 440px; margin: 18px auto 0; }
.login-submit { width: 100%; margin-top: 20px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 760px) {
  .header-content { align-items: flex-start; flex-direction: column; gap: 18px; padding: 20px; }
  .navigation { flex-wrap: wrap; }
  .navigation button { padding: 9px 12px; }
  .workspace { padding: 30px 20px 48px; }
  .page-heading { align-items: flex-start; flex-direction: column; }
  h1 { font-size: 25px; }
  table { min-width: 760px; }
  .form-panel { padding: 24px; }
  .login-page { margin-top: 0; }
}
</style>
