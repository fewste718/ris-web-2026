using backend.Auth;
using backend.Dtos;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/support-tickets")]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError)]
public sealed class SupportTicketsController : ControllerBase
{
    private readonly ISupportTicketService _service;

    public SupportTicketsController(ISupportTicketService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<SupportTicketResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SupportTicketResponse>>> GetAll(
        [FromQuery] string? status = null, CancellationToken cancellationToken = default)
    {
        return Ok(await _service.GetAll(CurrentUser.Id(User), status, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<SupportTicketResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetById(id, CurrentUser.Id(User), cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Dispatcher")]
    [ProducesResponseType<SupportTicketResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<SupportTicketResponse>> CreateSupportTicket(CreateSupportTicketRequest request,
        CancellationToken cancellationToken)
    {
        HttpContext.Items["EquipmentId"] = request.EquipmentId;
        var created = await _service.Create(request, CurrentUser.Id(User), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:int}/assignee")]
    [Authorize(Roles = "Dispatcher")]
    [ProducesResponseType<SupportTicketResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketResponse>> Assign(int id, AssignSupportTicketRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.Assign(id, request, CurrentUser.Id(User), cancellationToken));
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType<SupportTicketResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketResponse>> ChangeStatus(int id, ChangeSupportTicketStatusRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.ChangeStatus(id, request, CurrentUser.Id(User), cancellationToken));
    }
}
