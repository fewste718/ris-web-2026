# API-контракт

## Таблица API

| Метод и путь | Тело запроса | Успех | Ошибка |
|---|---|---|---|
| GET /api/access-requests | — | 200, массив объектов или `[]` | — |
| GET /api/access-requests/{id} | — | 200, объект | 404 |
| POST /api/access-requests | title, systemId, description | 201, объект с id и number | 400 |
| PATCH /api/access-requests/{id}/assignee | assigneeUserId | 200, объект | 404 |
| PATCH /api/access-requests/{id}/status | status | 200, объект | 404, 409 |

## Правила

- **Статусы только:** `New`, `InProgress`, `Closed`, `Cancelled`. Других кодов быть не должно.
- **DELETE не используем.** Отмена заявки — это смена статуса на `Cancelled`, строка в базе остаётся.
- **Назначение и смена статуса — разные PATCH.** Если сделать один «обновить всё», исполнитель случайно сменит и исполнителя, и тему заявки. Разные действия — разные адреса.
- **id ≠ number.** `id` — машинный ключ для API (`/api/access-requests/17`), `number` — человеческий номер («AR-104»), его удобно диктовать по телефону.

## Пример тела создания заявки

```json
{
  "title": "Доступ к 1С для нового сотрудника",
  "systemId": 2,
  "description": "Требуется доступ к системе 1С: Бухгалтерия для отдела кадров"
}
```

Клиент **не присылает** при создании: `id`, `number`, `status`, `assigneeUserId`. Их определяет сервер.

## Пример ответа на создание (201)

```json
{
  "id": 17,
  "number": "AR-104",
  "title": "Доступ к 1С для нового сотрудника",
  "systemId": 2,
  "status": "New",
  "createdByUserId": 5,
  "assigneeUserId": null
}
```

## Пример назначения исполнителя

```
PATCH /api/access-requests/17/assignee
```

```json
{
  "assigneeUserId": 3
}
```

Статус при этом не меняется — заявка всё ещё `New`, просто у неё появился ответственный.

## Пример смены статуса

```
PATCH /api/access-requests/17/status
```

```json
{
  "status": "InProgress"
}
```

Сервер проверяет, что новый статус — один из четырёх разрешённых. Если клиент пришлёт `"Done"` или `"Open"` — ответ `400`.

## Чего в API нет

- Нет `DELETE /api/access-requests/{id}` — отмена через статус.
- Нет одного общего `PATCH /api/access-requests/{id}` — только два раздельных.
- Нет `POST /api/access-requests/create` — глагол в URL не нужен, метод POST уже говорит «создать».
- Нет `GET /api/getAllRequests` — ресурс называется существительным во множественном числе.
