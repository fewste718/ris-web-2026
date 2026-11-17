using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize(Roles = nameof(UserRole.Dispatcher))]
[Route("api/equipment")]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
public sealed class EquipmentController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<EquipmentResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<EquipmentResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var equipment = await (
            from item in db.Equipment.AsNoTracking()
            join client in db.Clients.AsNoTracking() on item.ClientId equals client.Id
            orderby item.Id
            select new EquipmentResponse(item.Id, item.Name, client.Id, client.Name))
            .ToArrayAsync(cancellationToken);
        return Ok(equipment);
    }
}
