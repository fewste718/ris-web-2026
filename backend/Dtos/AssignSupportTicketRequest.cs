using System.ComponentModel.DataAnnotations;

namespace backend.Dtos;

public sealed class AssignSupportTicketRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "assigneeUserId должен быть положительным целым числом.")]
    public int AssigneeUserId { get; set; }
}
