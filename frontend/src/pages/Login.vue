<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../api/auth.js'
import { sessionNotice } from '../auth/session.js'

const router = useRouter()
const route = useRoute()
const form = ref({ login: '', password: '' })
const errors = ref({})
const requestError = ref('')
const submitting = ref(false)

async function onLogin() {
  if (submitting.value) return
  errors.value = {}
  requestError.value = ''
  sessionNotice.value = ''
  if (!form.value.login.trim()) errors.value.login = 'Введите логин.'
  if (!form.value.password) errors.value.password = 'Введите пароль.'
  if (Object.keys(errors.value).length) return
  submitting.value = true
  try {
    const user = await login(form.value.login.trim(), form.value.password)
    form.value.password = ''
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    const target = redirect.startsWith('/') && !redirect.startsWith('//') ? router.resolve(redirect) : null
    const allowed = target?.matched.length && target.path !== '/login'
      && (!target.meta.role || target.meta.role === user.role)
    await router.replace(allowed ? target.fullPath : '/')
  } catch (error) {
    requestError.value = error.message
    errors.value = error.errors ?? {}
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="login-page" aria-labelledby="login-heading">
    <p class="eyebrow">Служба поддержки</p>
    <h1 id="login-heading">Вход в систему</h1>
    <p class="page-description">Для диспетчеров и инженеров технической поддержки.</p>

    <form class="panel form-panel" novalidate @submit.prevent="onLogin">
      <div class="field">
        <label for="login">Логин</label>
        <input id="login" v-model="form.login" name="login" type="text" autocomplete="username" required :disabled="submitting" :aria-invalid="Boolean(errors.login)" :aria-describedby="errors.login ? 'login-error' : undefined" placeholder="Введите логин">
        <p v-if="errors.login" id="login-error" class="field-error" role="alert">{{ errors.login }}</p>
      </div>
      <div class="field">
        <label for="password">Пароль</label>
        <input id="password" v-model="form.password" name="password" type="password" autocomplete="current-password" required :disabled="submitting" :aria-invalid="Boolean(errors.password)" :aria-describedby="errors.password ? 'password-error' : undefined" placeholder="Введите пароль">
        <p v-if="errors.password" id="password-error" class="field-error" role="alert">{{ errors.password }}</p>
      </div>
      <p v-if="sessionNotice" class="session-notice" role="status">{{ sessionNotice }}</p>
      <p v-if="requestError" class="request-error" role="alert">{{ requestError }}</p>
      <button class="button button-primary login-submit" type="submit" :disabled="submitting">{{ submitting ? 'Входим…' : 'Войти' }}</button>
    </form>
  </section>
</template>

<style scoped>
.field-error, .request-error { margin: 8px 0 0; color: #a12e27; font-size: 13px; line-height: 1.5; }
.request-error, .session-notice { margin-top: 22px; }
.session-notice { color: #596b82; font-size: 13px; line-height: 1.5; }
[aria-invalid="true"] { border-color: #a12e27; }
button:disabled { opacity: 0.65; cursor: default; }
</style>
