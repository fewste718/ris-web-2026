using backend.Dtos;

namespace backend.Services;

public interface ISupportTicketService
{
    Task<IReadOnlyList<SupportTicketResponse>> GetAll(int userId, string? status, CancellationToken cancellationToken);
    Task<SupportTicketResponse> GetById(int id, int userId, CancellationToken cancellationToken);
    Task<SupportTicketResponse> Create(CreateSupportTicketRequest request, int userId, CancellationToken cancellationToken);
    Task<SupportTicketResponse> Assign(int id, AssignSupportTicketRequest request, int userId, CancellationToken cancellationToken);
    Task<SupportTicketResponse> ChangeStatus(int id, ChangeSupportTicketStatusRequest request, int userId, CancellationToken cancellationToken);
}
