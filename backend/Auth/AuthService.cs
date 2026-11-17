using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Auth;

public sealed class AuthService(AppDbContext db, IPasswordHasher<User> passwordHasher, JwtOptions jwt)
{
    // Проверка неизвестного логина также выполняет password hasher и возвращает ту же ошибку.
    private static readonly User MissingUser = new();
    private static readonly string MissingUserHash = new PasswordHasher<User>()
        .HashPassword(MissingUser, Guid.NewGuid().ToString());

    public async Task<LoginResponse> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(item => item.Login == request.Login, cancellationToken);
        var result = passwordHasher.VerifyHashedPassword(user ?? MissingUser,
            user?.PasswordHash ?? MissingUserHash, request.Password!);
        if (user is null || result == PasswordVerificationResult.Failed)
            throw new SupportTicketException(401, "Неверный логин или пароль.");

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password!);
            await db.SaveChangesAsync(cancellationToken);
        }

        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddMinutes(jwt.LifetimeMinutes);
        var token = new JwtSecurityToken(jwt.Issuer, jwt.Audience,
        [
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString(CultureInfo.InvariantCulture)),
            new Claim("role", user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        ], now.UtcDateTime, expiresAt.UtcDateTime,
            new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                SecurityAlgorithms.HmacSha256));
        return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt,
            AuthenticatedUser.From(user));
    }

    public async Task<AuthenticatedUser> Me(int userId, CancellationToken cancellationToken)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(item => item.Id == userId, cancellationToken)
            ?? throw new SupportTicketException(401, "Войдите в систему.");
        return AuthenticatedUser.From(user);
    }
}
