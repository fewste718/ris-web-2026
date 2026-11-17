namespace backend.Models;

public enum UserRole { Dispatcher, Engineer }

public sealed class User
{
    public int Id { get; set; }
    public string Login { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
}
