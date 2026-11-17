using backend.Models;

namespace backend.Data;

// Начальные справочники миграции. Во время HTTP-запросов данные читаются из БД.
public static class ReferenceData
{
    public static IReadOnlyList<Client> Clients { get; } =
    [
        new() { Id = 3, Name = "Клиент А" },
        new() { Id = 4, Name = "Клиент Б" }
    ];

    public static IReadOnlyList<Equipment> Equipment { get; } =
    [
        new() { Id = 7, Name = "Сетевой принтер 01", ClientId = 3 },
        new() { Id = 8, Name = "Файловый сервер 01", ClientId = 4 }
    ];

    public static IReadOnlyList<User> Users { get; } =
    [
        new()
        {
            Id = 1, Login = "dispatcher1", FullName = "Диспетчер 1", Role = UserRole.Dispatcher,
            PasswordHash = "AQAAAAIAAYagAAAAED3dul177ZRdcM8wAY6JtCPPMYLXttLpfDYgmWPcSlXBDhwxYzIqrgSm3U0OxTEpZg=="
        },
        new()
        {
            Id = 2, Login = "engineer1", FullName = "Инженер 1", Role = UserRole.Engineer,
            PasswordHash = "AQAAAAIAAYagAAAAEJ5xGucLBig6fYmt3HmipYZUmBZ/8ijoami07slzi6oS14898dubiWVvl8kbD9E/XQ=="
        },
        new()
        {
            Id = 3, Login = "engineer2", FullName = "Инженер 2", Role = UserRole.Engineer,
            PasswordHash = "AQAAAAIAAYagAAAAEPegoACPr2Pzpiofk6omGhLgjUdllVW1tUQryLB+6W5geGgFbH0gx/1b0lxNr7NPCg=="
        }
    ];
}
