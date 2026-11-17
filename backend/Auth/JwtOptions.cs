using System.Text;

namespace backend.Auth;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "mobius-support-api";
    public string Audience { get; set; } = "mobius-support-vue";
    public string SigningKey { get; set; } = string.Empty;
    public int LifetimeMinutes { get; set; } = 30;

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(Issuer) || string.IsNullOrWhiteSpace(Audience)
            || string.IsNullOrWhiteSpace(SigningKey) || Encoding.UTF8.GetByteCount(SigningKey) < 32
            || LifetimeMinutes is < 1 or > 120)
            throw new InvalidOperationException(
                "Настройте Jwt:Issuer, Jwt:Audience, Jwt:LifetimeMinutes (1–120) и Jwt:SigningKey (не менее 32 байт) через user-secrets или переменные окружения.");
    }
}
