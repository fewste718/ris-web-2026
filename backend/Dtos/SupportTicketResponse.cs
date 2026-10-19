namespace backend.Dtos;

public sealed record SupportTicketResponse(
    int Id,
    string Number,
    string Title,
    int EquipmentId,
    string EquipmentName,
    int ClientId,
    string ClientName,
    string Description,
    string Status,
    int CreatedByUserId,
    int? AssigneeUserId,
    string? AssigneeFullName,
    DateTimeOffset CreatedAt);
