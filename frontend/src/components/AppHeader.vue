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
        <router-link to="/">Заявки</router-link>
        <router-link to="/new">Создать заявку</router-link>
        <router-link to="/login">Вход</router-link>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header { background: #fff; border-bottom: 1px solid #dfe5ed; }
.header-content { max-width: 1240px; min-height: 92px; margin: 0 auto; padding: 18px 30px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.brand { display: flex; align-items: center; gap: 12px; }
.brand-mark { width: 42px; height: 42px; border-radius: 11px; display: grid; place-items: center; background: #2458a6; color: #fff; font-size: 26px; font-weight: 700; }
.brand-name { font-size: 17px; font-weight: 650; }
.brand-caption { margin-top: 3px; color: #5c6d82; font-size: 13px; }
.navigation { display: flex; gap: 6px; }
.navigation a { display: block; text-decoration: none; border: 0; border-radius: 7px; background: transparent; padding: 10px 15px; color: #53637b; cursor: pointer; }
.navigation a:hover { background: #f0f4fa; }
.navigation .router-link-exact-active { color: #1d4f99; background: #eaf0f9; font-weight: 600; }
@media (max-width: 760px) {
  .header-content { align-items: flex-start; flex-direction: column; gap: 18px; padding: 20px; }
  .navigation { flex-wrap: wrap; }
  .navigation a { padding: 9px 12px; }
}
</style>
