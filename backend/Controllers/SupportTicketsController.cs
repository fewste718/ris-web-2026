using System.ComponentModel.DataAnnotations;
using backend.Dtos;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/support-tickets")]
[ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
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
        [FromHeader(Name = "X-User-Id"), Range(1, int.MaxValue)] int userId,
        [FromQuery] string? status = null, CancellationToken cancellationToken = default)
    {
        return Ok(await _service.GetAll(userId, status, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<SupportTicketResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketResponse>> GetById(int id,
        [FromHeader(Name = "X-User-Id"), Range(1, int.MaxValue)] int userId, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetById(id, userId, cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType<SupportTicketResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<SupportTicketResponse>> CreateSupportTicket(CreateSupportTicketRequest request,
        [FromHeader(Name = "X-User-Id"), Range(1, int.MaxValue)] int userId, CancellationToken cancellationToken)
    {
        HttpContext.Items["EquipmentId"] = request.EquipmentId;
        var created = await _service.Create(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPatch("{id:int}/assignee")]
    [ProducesResponseType<SupportTicketResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketResponse>> Assign(int id, AssignSupportTicketRequest request,
        [FromHeader(Name = "X-User-Id"), Range(1, int.MaxValue)] int userId, CancellationToken cancellationToken)
    {
        return Ok(await _service.Assign(id, request, userId, cancellationToken));
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType<SupportTicketResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupportTicketResponse>> ChangeStatus(int id, ChangeSupportTicketStatusRequest request,
        [FromHeader(Name = "X-User-Id"), Range(1, int.MaxValue)] int userId, CancellationToken cancellationToken)
    {
        return Ok(await _service.ChangeStatus(id, request, userId, cancellationToken));
    }
}
