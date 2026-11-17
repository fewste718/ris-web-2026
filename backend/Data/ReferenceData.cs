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
            PasswordHash = "AQAAAAIAAYagAAAAEN1XHvHfeLR/CvM4gt4xOSGZdD/PTlkrf+DENnFw0ME0PwYU/49gNFgYpEiHY1o4Vg=="
        },
        new()
        {
            Id = 2, Login = "engineer1", FullName = "Инженер 1", Role = UserRole.Engineer,
            PasswordHash = "AQAAAAIAAYagAAAAEG+oQQiyvY0yNwPyyZQ6tX4ZGn7dtZipnqC5Ae26AL0u1hKeGjkh9YllT0BheZZWew=="
        },
        new()
        {
            Id = 3, Login = "engineer2", FullName = "Инженер 2", Role = UserRole.Engineer,
            PasswordHash = "AQAAAAIAAYagAAAAEBSoxAMxx8AI9sdz8fZqswutM4jyH0x/4F3YavGfT7w9H0mjE9qpG5syTPZCTe06LA=="
        }
    ];
}
