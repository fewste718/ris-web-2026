using backend.Data;
using backend.Dtos;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize(Roles = nameof(UserRole.Dispatcher))]
[Route("api/users")]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
public sealed class UsersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<EngineerResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EngineerResponse>>> GetEngineers(
        [FromQuery] string role = nameof(UserRole.Engineer), CancellationToken cancellationToken = default)
    {
        // Для явно пустого значения model binding может подставить значение по умолчанию.
        // Проверяем исходный query, чтобы отличать его от отсутствующего фильтра.
        var roleSpecified = Request.Query.TryGetValue("role", out var requestedRoles);
        if (role != nameof(UserRole.Engineer)
            || roleSpecified && (requestedRoles.Count != 1 || requestedRoles[0] != nameof(UserRole.Engineer)))
            throw new SupportTicketException(400, "Допустим только один фильтр role=Engineer.");

        var engineers = await db.Users.AsNoTracking()
            .Where(user => user.Role == UserRole.Engineer)
            .OrderBy(user => user.Id)
            .Select(user => new EngineerResponse(user.Id, user.FullName))
            .ToArrayAsync(cancellationToken);
        return Ok(engineers);
    }
}
