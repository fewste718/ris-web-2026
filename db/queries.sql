-- 1. Фильтр: новые заявки, сначала самые поздние.
SELECT number, title, status, created_at
FROM support_tickets
WHERE status = 'New'
ORDER BY created_at DESC, id DESC;

-- 2. Сортировка: весь реестр от новых записей к старым.
SELECT number, status, created_at
FROM support_tickets
ORDER BY created_at DESC, id DESC;

-- 3. JOIN: названия оборудования и клиента, назначенный инженер.
-- LEFT JOIN сохраняет в результате заявку без назначенного исполнителя.
SELECT t.number, e.name AS equipment_name, c.name AS client_name,
       u.full_name AS assignee_name, t.status
FROM support_tickets AS t
JOIN equipment AS e ON e.id = t.equipment_id
JOIN clients AS c ON c.id = e.client_id
LEFT JOIN users AS u ON u.id = t.assignee_user_id
ORDER BY t.created_at DESC, t.id DESC;

-- 4. GROUP BY: количество заявок в каждом из четырёх статусов.
SELECT status, COUNT(*) AS ticket_count
FROM support_tickets
GROUP BY status
ORDER BY status;
