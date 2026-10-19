using backend.Dtos;

namespace backend.Services;

public interface ISupportTicketService
{
    IReadOnlyList<SupportTicketResponse> GetAll(int userId, string? status);
    SupportTicketResponse GetById(int id, int userId);
    SupportTicketResponse Create(CreateSupportTicketRequest request, int userId);
    SupportTicketResponse Assign(int id, AssignSupportTicketRequest request, int userId);
    SupportTicketResponse ChangeStatus(int id, ChangeSupportTicketStatusRequest request, int userId);
}
