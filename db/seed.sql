-- ЛР9. Учебные данные; выполнять после schema.sql.
-- ID справочников совпадают с ReferenceData.cs из ЛР8.
BEGIN;

INSERT INTO clients (id, name) VALUES
    (3, 'Клиент А'),
    (4, 'Клиент Б');

INSERT INTO equipment (id, name, client_id) VALUES
    (7, 'Сетевой принтер 01', 3),
    (8, 'Файловый сервер 01', 4);

-- Учебные хеши ASP.NET Core PasswordHasher (PBKDF2).
-- Исходные случайные пароли не сохранялись; вход в систему в ЛР9 не реализуется.
INSERT INTO users (id, login, full_name, role, password_hash) VALUES
    (1, 'dispatcher1', 'Диспетчер 1', 'Dispatcher',
     'AQAAAAIAAYagAAAAED3dul177ZRdcM8wAY6JtCPPMYLXttLpfDYgmWPcSlXBDhwxYzIqrgSm3U0OxTEpZg=='),
    (2, 'engineer1', 'Инженер 1', 'Engineer',
     'AQAAAAIAAYagAAAAEJ5xGucLBig6fYmt3HmipYZUmBZ/8ijoami07slzi6oS14898dubiWVvl8kbD9E/XQ=='),
    (3, 'engineer2', 'Инженер 2', 'Engineer',
     'AQAAAAIAAYagAAAAEPegoACPr2Pzpiofk6omGhLgjUdllVW1tUQryLB+6W5geGgFbH0gx/1b0lxNr7NPCg==');

INSERT INTO support_tickets
    (id, number, title, description, equipment_id, status,
     created_at, created_by_user_id, assignee_user_id)
VALUES
    (1, 'SUP-2026-0001', 'Не печатает сетевой принтер',
     'После отправки документа принтер не начинает печать.',
     7, 'New', '2026-10-27T08:00:00Z', 1, NULL),
    (2, 'SUP-2026-0002', 'Недоступна общая папка на сервере',
     'При открытии общей папки появляется ошибка доступа.',
     8, 'InProgress', '2026-10-27T10:00:00Z', 1, 2),
    (3, 'SUP-2026-0003', 'Принтер печатает полосами',
     'На распечатанных документах появились вертикальные полосы.',
     7, 'Closed', '2026-10-28T07:00:00Z', 1, 3),
    (4, 'SUP-2026-0004', 'Повторное обращение по принтеру',
     'Диспетчер отменил повторное обращение, исходная заявка сохранена.',
     7, 'Cancelled', '2026-10-28T09:00:00Z', 1, 2),
    (5, 'SUP-2026-0005', 'Требуется настроить сканирование',
     'Необходимо настроить отправку сканов в сетевую папку клиента.',
     7, 'New', '2026-10-29T06:00:00Z', 1, 3),
    (6, 'SUP-2026-0006', 'Сервер не отвечает на запросы',
     'Сотрудники клиента не могут подключиться к файловому серверу.',
     8, 'InProgress', '2026-10-29T07:00:00Z', 1, 3);

-- После явной вставки ID следующий автоматически выданный ID должен быть свободен.
SELECT setval(pg_get_serial_sequence('clients', 'id'), (SELECT MAX(id) FROM clients));
SELECT setval(pg_get_serial_sequence('equipment', 'id'), (SELECT MAX(id) FROM equipment));
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('support_tickets', 'id'), (SELECT MAX(id) FROM support_tickets));

COMMIT;
