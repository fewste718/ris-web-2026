using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.Auth;

public sealed class LoginRequest
{
    private string? _login;

    [Required(ErrorMessage = "Укажите логин.")]
    [StringLength(100, ErrorMessage = "Логин: не более 100 символов.")]
    public string? Login { get => _login; set => _login = value?.Trim(); }

    [Required(ErrorMessage = "Укажите пароль.")]
    [StringLength(256, ErrorMessage = "Пароль: не более 256 символов.")]
    public string? Password { get; set; }
}

public sealed record AuthenticatedUser(int Id, string Login, string FullName, string Role)
{
    public static AuthenticatedUser From(User user) => new(user.Id, user.Login, user.FullName, user.Role.ToString());
}

public sealed record LoginResponse(string AccessToken, DateTimeOffset ExpiresAt, AuthenticatedUser User);
