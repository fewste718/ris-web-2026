# Матрица требований

Связь: требование из ЛР1 → поле или сущность → запрос → критерий приёмки.

| № | Требование ЛР1 | Поле или сущность | Запрос | Критерий |
|---|---|---|---|---|
| 1 | Сотрудник создаёт заявку на доступ | AccessRequest: title, systemId, description | POST /api/access-requests | Критерий 1 |
| 2 | После создания заявка получает статус New и номер | status, number | POST /api/access-requests | Критерий 1 |
| 3 | Администратор назначает исполнителя | assigneeUserId | PATCH /api/access-requests/{id}/assignee | Критерий 2 |
| 4 | Назначение не меняет статус заявки | status, assigneeUserId | PATCH /api/access-requests/{id}/assignee | Критерий 2 |
| 5 | Исполнитель переводит заявку в работу | status = InProgress | PATCH /api/access-requests/{id}/status | Критерий 3 |
| 6 | Исполнитель закрывает заявку | status = Closed | PATCH /api/access-requests/{id}/status | Критерий 3 |
| 7 | Отмена заявки через статус | status = Cancelled | PATCH /api/access-requests/{id}/status | Критерий 3 |
| 8 | Сотрудник видит только свои заявки | createdByUserId | GET /api/access-requests?mine=true | Критерий 4 |
| 9 | Администратор видит все заявки | — | GET /api/access-requests | Критерий 4 |
| 10 | Фильтр списка по статусу | status | GET /api/access-requests?status=New | Критерий 4 |
| 11 | Просмотр деталей одной заявки | id | GET /api/access-requests/{id} | Критерий 5 |
| 12 | Запрет менять статус чужой заявки | assigneeUserId | PATCH /api/access-requests/{id}/status | Критерий 6 |
| 13 | Запрет назначать исполнителя на закрытую заявку | status | PATCH /api/access-requests/{id}/assignee | Критерий 6 |
| 14 | Название системы не дублируется в заявках | System, systemId | GET /api/access-requests/{id} | Критерий 7 |

## Критерии приёмки

| № | Критерий | Как проверяется |
|---|---|---|
| 1 | Создание возвращает 201, id, number, status = New | POST с валидным телом → проверить поля ответа |
| 2 | Назначение заполняет assigneeUserId, статус не меняется | PATCH assignee → в ответе assigneeUserId ≠ null, status = New |
| 3 | Смена статуса на любой из четырёх разрешённых кодов | PATCH status = InProgress/Closed/Cancelled → 200, невалидный код → 400 |
| 4 | Список и фильтры работают | GET с разными query → проверить длину массива |
| 5 | Детали заявки возвращают все поля | GET по id → сравнить с образцом |
| 6 | Запреты возвращают 409 или 403 | PATCH чужой заявки → не 200 |
| 7 | Название системы приходит из справочника | GET заявки → поле system.name заполнено, не пустое |

## Что покрыто и чего нет

**Покрыто матрицей:** все ФТ-1 – ФТ-10 из ЛР1.

**Не входит в семестр:**
- История изменений (аудит) 
- Уведомления по email 
- Автопроверка прав через LDAP 
- Импорт сотрудников из Excel 
