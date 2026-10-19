using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace backend.Filters;

public sealed class ApiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _logger;

    public ApiExceptionFilter(ILogger<ApiExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        var expected = context.Exception as SupportTicketException;
        var status = expected?.StatusCode ?? StatusCodes.Status500InternalServerError;
        if (expected is null)
        {
            var equipmentId = context.HttpContext.Request.RouteValues["equipmentId"];
            // Для POST сохраняется только числовая ссылка, без полного тела запроса.
            if (context.HttpContext.Items.TryGetValue("EquipmentId", out var id)) equipmentId = id;
            _logger.LogError("{Operation} failed; equipmentId={EquipmentId}; ticketId={TicketId}; error={ErrorType}",
                context.ActionDescriptor.RouteValues["action"], equipmentId,
                context.HttpContext.Request.RouteValues["id"], context.Exception.GetType().Name);
        }

        context.Result = new ObjectResult(new ProblemDetails
        {
            Status = status,
            Title = expected?.Message ?? "Не удалось обработать запрос.",
            Type = "about:blank",
            Instance = context.HttpContext.Request.Path
        }) { StatusCode = status, ContentTypes = { "application/problem+json" } };
        context.ExceptionHandled = true;
    }
}
