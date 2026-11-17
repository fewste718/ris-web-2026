# ris-web-2026

Лабораторные работы по дисциплине «Разработка информационных систем и Web-приложений».

- **Тема №68:** Разработка информационной системы управления заявками в IT-аутсорсинговой компании.
- **Организация:** «Мобиус Технологии» (ООО «МобиусТех»).
- **Студент:** Пантин Данил Денисович, ТРИС-2-23.
- **Стек:** Vue 3 + ASP.NET Core + PostgreSQL.
- **Статус темы:** на проверке.

Диспетчер регистрирует обращение по оборудованию клиента, назначает инженера и при необходимости отменяет заявку. Назначенный инженер переводит свою заявку в работу и завершает её. Клиент определяется через оборудование; автор и исполнитель учитываются отдельно.

## Стек и адреса

Проверено с Node.js **24.15.0**, npm **11.12.1**, .NET SDK **9.0.320** и PostgreSQL **18.4**. Клиенту нужен Node.js 24 от 24.12; backend использует `net9.0`. Версии пакетов закреплены в проектах и `package-lock.json`, инструмент EF — в `.config/dotnet-tools.json`.

| Узел | Адрес |
|---|---|
| Vue | `http://localhost:5173` |
| API | `http://localhost:5000` |
| Swagger, Development | `http://localhost:5000/swagger/index.html` |
| PostgreSQL | Порт из строки подключения; в примере ниже 5432, при проверке отчёта — 55439 |

## Подключение API к PostgreSQL

Установите Git, Node.js, .NET SDK 9 и PostgreSQL. Сервер PostgreSQL должен быть запущен. Откройте PowerShell из корня проекта.

Создайте отдельную учебную БД `mobius_support` через pgAdmin или `createdb`. Имя пользователя PostgreSQL и его пароль относятся к БД, а не к диспетчеру приложения.

```powershell
# Поправьте версию PostgreSQL и порт под свой экземпляр.
$env:PATH = "C:\Program Files\PostgreSQL\18\bin;$env:PATH"
$dbPort = 5432
createdb -h 127.0.0.1 -p $dbPort -U postgres -W mobius_support

dotnet tool restore
dotnet restore backend/backend.csproj
cd backend

# Подставьте свои порт, пользователя и пароль БД.
dotnet user-secrets set "ConnectionStrings:Default" "Host=127.0.0.1;Port=5432;Database=mobius_support;Username=postgres;Password=ВАШ_ПАРОЛЬ"

# Один раз создайте отдельный случайный ключ учебного JWT.
$randomBytes = New-Object byte[] 64
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($randomBytes)
$rng.Dispose()
@{ 'Jwt:SigningKey' = [Convert]::ToBase64String($randomBytes) } | ConvertTo-Json | dotnet user-secrets set

dotnet ef database update -- --environment Development
dotnet run --launch-profile http
```

`createdb` выполняется один раз. Если БД уже подготовлена, повторно создавать её не нужно. Порт в `createdb` и строке подключения должен совпадать. Строка подключения и ключ JWT сохраняются в user-secrets вне Git; альтернатива — переменные `ConnectionStrings__Default` и `Jwt__SigningKey`. В публичных конфигурациях секреты пустые. Ключ повторно генерировать перед каждым запуском не требуется.

Миграции создают четыре таблицы, индексы, последовательность номеров и начальные данные: 2 клиента, 2 единицы оборудования и 3 учебных сотрудника. На новой БД заявок нет. `DemoUserPasswords` задаёт хеши учебных паролей. Повторный `database update` проверяет историю и сохраняет имеющиеся данные. API не применяет миграции автоматически.

После `Now listening on: http://localhost:5000` оставьте терминал работающим. `/health` возвращает `ok`, `/info` — сведения о приложении и ЛР12. Остановка — Ctrl+C.

## Запуск клиента

Во втором терминале PowerShell из корня проекта:

```powershell
cd frontend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Откройте **http://localhost:5173/login**. В `.env.example` задано `VITE_API_BASE_URL=http://localhost:5000`. После изменения `.env` перезапустите Vite. API в Development разрешает CORS только для `http://localhost:5173`; используйте именно этот адрес клиента.

Обычный режим обращается к настоящему API. Старые примеры mock доступны только явным `?api=mock` в dev и используются для состояний из ЛР6; назначение и статусы проверяйте без этого параметра.

## Вход и права

Выбран один способ входа: учебный JWT в `Authorization: Bearer <accessToken>`. Токен действует 30 минут и хранится в sessionStorage вкладки. F5 сохраняет вход, выход очищает сеанс и список; при 401 нужно войти снова.

| Логин | Учебный пароль | Роль |
|---|---|---|
| `dispatcher1` | `Lab11-Dispatcher!2026` | Диспетчер |
| `engineer1` | `Lab11-Engineer1!2026` | Инженер 1 |
| `engineer2` | `Lab11-Engineer2!2026` | Инженер 2 |

Учётки предназначены только для учебного контура. В PostgreSQL находятся хеши ASP.NET Identity PasswordHasher с солью. Пароль и хеш не возвращаются клиенту. `X-User-Id` не участвует в определении сотрудника.

Диспетчер видит весь реестр, создаёт заявки, назначает и переназначает инженера только при New, отменяет New/InProgress. Инженер видит только свои заявки и выполняет New → InProgress → Closed. Отмена сохраняет исполнителя. Closed и Cancelled окончательны; удаления и повторного открытия нет. Права проверяет сервер независимо от кнопок. [Матрица ролей](docs/role-matrix.md).

## Проверка сквозного сценария

1. Войдите как `dispatcher1`. Нажмите «Создать заявку», введите корректные тему и описание, выберите «Сетевой принтер 01 · Клиент А · № 7» и создайте заявку.
2. Запишите **ID заявки и номер**, показанные в реестре. В F12 → Network проверьте POST `/api/support-tickets` → 201 и тот же ID в Response.
3. В строке этой заявки выберите «Инженер 1» и нажмите «Назначить». Исполнитель изменится, статус останется «Новая». В Network появится отдельный PATCH `/{id}/assignee` → 200.
4. Выйдите и войдите как `engineer1`. Найдите ту же заявку и нажмите «Взять в работу». Статус станет «В работе», ID, номер и исполнитель сохранятся; PATCH `/{id}/status` → 200.
5. Откройте Query Tool именно базы `mobius_support` и выполните запрос ниже, подставив записанный ID.
6. Остановите API через Ctrl+C, снова запустите `dotnet run --launch-profile http` из `backend`, обновите список в браузере. Проверьте ту же заявку и повторите SELECT. Схему, seed и миграции при этой проверке повторно не выполняйте.

```sql
SELECT id, number, title, status, assignee_user_id
FROM support_tickets
WHERE id = 70; -- замените на ID созданной вами заявки
```

Проверенный пример: `70 / SUP-2026-0068`, исполнитель 2, статус InProgress. [Три критерия приёмки](docs/acceptance-check.md), [отчёт и доказательства](docs/reports/lab-12.md), [известные ограничения и открытые проверки](docs/known-defects.md).

Фильтр статуса применяется сервером и сохраняет ограничения видимости инженера. Диспетчер может отменить заявку; назначенный инженер — завершить InProgress. Обновление строки выполняется только после ответа API. При ошибках справочников доступны повторная загрузка и понятное сообщение.

## API

| Метод и путь | Назначение |
|---|---|
| `POST /api/auth/login` | Вход: `login`, `password` → `accessToken`, `expiresAt`, `user` |
| `GET /api/auth/me` | Текущий сотрудник |
| `GET /api/equipment` | Оборудование с клиентами, только диспетчер |
| `GET /api/users?role=Engineer` | ID и имена инженеров, только диспетчер |
| `GET /api/support-tickets?status=New` | Доступный реестр, фильтр необязателен |
| `GET /api/support-tickets/{id}` | Одна доступная заявка |
| `POST /api/support-tickets` | Создать: `title`, числовой `equipmentId`, `description` |
| `PATCH /api/support-tickets/{id}/assignee` | Назначить: `assigneeUserId` |
| `PATCH /api/support-tickets/{id}/status` | Изменить статус: `status` |

Тема после trim — 5–80 символов, описание — 10–500. Оборудование должно существовать. ID, уникальный номер `SUP-{год UTC}-{последовательность}`, время, автора, New и отсутствие исполнителя задаёт сервер. Клиент определяется через оборудование. Номер и назначения сохраняются в PostgreSQL после перезапуска API.

Коды: 400 — неверные данные; 401 — нет действительного входа; 403 — нет прав на действие или заявку; 404 — записи нет; 409 — недопустимое состояние при разрешённом действии; 500 — безопасный ProblemDetails. [Полный контракт](docs/api-contract.md).

В Swagger сначала выполните login, затем вставьте только `accessToken` в **Authorize** без префикса `Bearer`. Для демонстрации ЛР12 основной сценарий выполняется через Vue.

## Автоматические проверки

При работающем API из корня проекта:

```powershell
node scripts/verify-lab12.mjs
npm exec --yes --package=newman -- newman run docs/api-collection/support-tickets.postman_collection.json
cd frontend
npm test
npm run test:workflow
npm run build
```

HTTP-прогоны создают свои учебные заявки и допускают заполненную БД. `test:workflow` проверяет настоящие модули клиента с API без браузера. `npm test` проверяет роли, состояния, справочники и защиту от поздних ответов. Результаты сохраняются в `docs/reports/evidence/lab-12/` без токенов и паролей.

## PostgreSQL и SQL

Скрипты `db/schema.sql`, `seed.sql`, `queries.sql` относятся к ЛР9 и отдельной БД `mobius_support_lab09`. Для работающего API используйте миграции, а не эти скрипты.

Из корня проекта после создания отдельной учебной БД:

```powershell
$env:PGCLIENTENCODING = 'UTF8'
$env:PGOPTIONS = '-c timezone=UTC'
createdb -h 127.0.0.1 -p 5432 -U postgres -W mobius_support_lab09
psql -X -h 127.0.0.1 -p 5432 -U postgres -d mobius_support_lab09 -W -v ON_ERROR_STOP=1 -f db/schema.sql
psql -X -h 127.0.0.1 -p 5432 -U postgres -d mobius_support_lab09 -W -v ON_ERROR_STOP=1 -f db/seed.sql
psql -X -h 127.0.0.1 -p 5432 -U postgres -d mobius_support_lab09 -W -v ON_ERROR_STOP=1 -P pager=off -f db/queries.sql
```

Подставьте свои порт и пользователя PostgreSQL. `schema.sql` удаляет четыре учебные таблицы вместе с данными и создаёт их заново; повторно запускайте его только для намеренной подготовки отдельной БД ЛР9. Для просмотра достаточно `queries.sql`. Пароль вводится по запросу.

## Лабораторные работы

| Работа | Материалы |
|---|---|
| ЛР1 | [Заявка](docs/project-proposal.md), [требования](docs/lab-01-requirements.md) |
| ЛР2 | [Архитектура](docs/architecture.md), [модель данных](docs/data-model.md), [API](docs/api-contract.md), [матрица требований](docs/requirements-matrix.md) |
| ЛР3 | [Каркас Vue и три экрана](docs/reports/lab-03.md) |
| ЛР4 | [Компоненты и маршруты](docs/reports/lab-04.md) |
| ЛР5 | [Форма и список](docs/reports/lab-05.md) |
| ЛР6 | [Клиент API и mock](docs/reports/lab-06.md) |
| ЛР7 | [ASP.NET Core Web API](docs/reports/lab-07.md) |
| ЛР8 | [REST и валидация](docs/reports/lab-08.md) |
| ЛР9 | [PostgreSQL и SQL](docs/reports/lab-09.md) |
| ЛР10 | [EF Core и миграции](docs/reports/lab-10.md) |
| ЛР11 | [Вход и права](docs/reports/lab-11.md) |
| ЛР12 | [Сквозная сборка](docs/reports/lab-12.md) |
