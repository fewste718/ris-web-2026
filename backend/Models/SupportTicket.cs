namespace backend.Models;

public sealed class SupportTicket
{
    public int Id { get; init; }
    public required string Number { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public int EquipmentId { get; init; }
    public int CreatedByUserId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public SupportTicketStatus Status { get; set; } = SupportTicketStatus.New;
    public int? AssigneeUserId { get; set; }
}
