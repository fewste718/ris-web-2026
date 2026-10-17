# Матрица требований

## Функциональные требования

| Требование ЛР1 | Поле или сущность | Запрос | Проверка |
|---|---|---|---|
| ФТ-1. Вход диспетчера и инженера | User: login, passwordHash, role | POST /api/auth/login | Верные данные → 200 и роль; неверные → 401 |
| ФТ-2. Форма с оборудованием и клиентом | Equipment, clientId → Client | GET /api/equipment | Вариант оборудования содержит числовой id и название клиента |
| ФТ-3. Создание заявки | SupportTicket: title, equipmentId, description, id, number, createdAt, createdByUserId, status, assigneeUserId | POST /api/support-tickets | Критерий 1: 201, номер, New, автор-диспетчер и пустой исполнитель |
| ФТ-4. Валидация | title, description, equipmentId; Equipment.clientId | POST /api/support-tickets | Неверные поля или ссылки → 400, запись не создана |
| ФТ-5. Общий список диспетчера | SupportTicket, Equipment, Client, User | GET /api/support-tickets | Диспетчер видит все заявки и сведения о клиенте и исполнителе; пустой список → 200 и [] |
| ФТ-6. Список инженера | assigneeUserId, текущий User.id | GET /api/support-tickets | Возвращаются только назначенные вошедшему инженеру заявки |
| ФТ-7. Фильтр по статусу | status | GET /api/support-tickets?status=New | Только доступные заявки выбранного статуса; неизвестный код → 400 |
| ФТ-8. Отдельное назначение инженера | assigneeUserId → User, role, status | GET /api/users?role=Engineer; PATCH /api/support-tickets/{id}/assignee | Критерий 2: 200, инженер записан, статус остался New |
| ФТ-9. Начало работы | assigneeUserId, status | PATCH /api/support-tickets/{id}/status | Критерий 3: только назначенный инженер переводит New → InProgress |
| ФТ-10. Завершение работы | assigneeUserId, status | PATCH /api/support-tickets/{id}/status | Назначенный инженер переводит InProgress → Closed; другой инженер и диспетчер получают 403 |
| ФТ-11. Отмена | status, number, assigneeUserId | PATCH /api/support-tickets/{id}/status | Диспетчер переводит New или InProgress → Cancelled; номер и исполнитель сохранены |
| ФТ-12. Запрет чужих и недоступных действий | User.role, текущий User.id, assigneeUserId | POST /api/support-tickets; PATCH /api/support-tickets/{id}/assignee; PATCH /api/support-tickets/{id}/status; GET /api/support-tickets/{id} | Запрещённое роли действие или чужая заявка инженера → 403, данные не изменены |
| ФТ-13. Запрет недопустимых переходов и назначения | status, assigneeUserId | PATCH /api/support-tickets/{id}/status; PATCH /api/support-tickets/{id}/assignee | Недопустимое состояние → 409; неизвестный статус → 400; отмена сохраняет строку |

## Три обязательных критерия

| № | Критерий ЛР1 | Результат |
|---|---|---|
| 1 | Диспетчер создаёт заявку | Сохранена одна SupportTicket с equipmentId, клиентом через Equipment, отдельными id и number, статусом New, автором и пустым исполнителем |
| 2 | Диспетчер назначает инженера | Изменён assigneeUserId, статус остался New, остальные поля сохранены |
| 3 | Назначенный инженер берёт заявку в работу | Статус стал InProgress; другой инженер и диспетчер не могут выполнить переход |

## Нефункциональные требования

| Требование ЛР1 | Объект проверки | Способ проверки |
|---|---|---|
| НФТ-1. Сохранность данных | PostgreSQL: SupportTicket, Equipment, Client, User | Создать заявку, перезапустить API и БД, повторить GET /api/support-tickets/{id}; сравнить номер, статус и связи |
| НФТ-2. Время отклика | GET /api/support-tickets и отображение списка | До 100 записей; после прогрева каждое из пяти открытий укладывается в 2 секунды |
| НФТ-3. Отображение | Три экрана Vue | Вход и основные действия доступны в Chrome, Firefox, Edge при окне 1280×720 без горизонтальной прокрутки |
| НФТ-4. Защита учётных данных | User.passwordHash, конфигурация и Git | В БД хранится хеш пароля, API не возвращает его; настоящие пароли и секреты подключения отсутствуют в Git |
