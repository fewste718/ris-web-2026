using backend.Models;

namespace backend.Data;

public static class ReferenceData
{
    public static IReadOnlyList<Client> Clients { get; } =
    [
        new(3, "Клиент А"),
        new(4, "Клиент Б")
    ];

    public static IReadOnlyList<Equipment> Equipment { get; } =
    [
        new(7, "Сетевой принтер 01", 3),
        new(8, "Файловый сервер 01", 4)
    ];

    public static IReadOnlyList<User> Users { get; } =
    [
        new(1, "Диспетчер 1", UserRole.Dispatcher),
        new(2, "Инженер 1", UserRole.Engineer),
        new(3, "Инженер 2", UserRole.Engineer)
    ];
}
