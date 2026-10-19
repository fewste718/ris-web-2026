using System.ComponentModel.DataAnnotations;

namespace backend.Dtos;

public sealed class ChangeSupportTicketStatusRequest
{
    [Required(ErrorMessage = "Укажите статус.")]
    [RegularExpression("^(New|InProgress|Closed|Cancelled)$", ErrorMessage = "Допустимы New, InProgress, Closed, Cancelled.")]
    public string? Status { get; set; }
}
