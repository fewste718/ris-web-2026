using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Services;

namespace backend.Auth;

public static class CurrentUser
{
    public static int Id(ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub), NumberStyles.None,
            CultureInfo.InvariantCulture, out var id) && id > 0
            ? id
            : throw new SupportTicketException(401, "Войдите в систему.");
}
