<template>
  <section class="login-page" aria-labelledby="login-heading">
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
</template>
