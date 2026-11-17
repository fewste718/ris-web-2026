import { createRouter, createWebHistory } from 'vue-router'
import TicketList from './pages/TicketList.vue'
import TicketNew from './pages/TicketNew.vue'
import Login from './pages/Login.vue'
import { ensureSession } from './api/auth.js'
import { authUser, sessionNotice } from './auth/session.js'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: TicketList, meta: { requiresAuth: true } },
    { path: '/new', component: TicketNew, meta: { requiresAuth: true, role: 'Dispatcher' } },
    { path: '/login', component: Login },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  try {
    if (!await ensureSession()) return { path: '/login', query: { redirect: to.fullPath } }
  } catch (error) {
    sessionNotice.value = error.message
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.role && authUser.value?.role !== to.meta.role) {
    return { path: '/', query: { access: 'denied' } }
  }
  return true
})

window.addEventListener('session-expired', () => {
  if (router.currentRoute.value.meta.requiresAuth) {
    router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
  }
})
