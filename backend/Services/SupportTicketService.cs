using backend.Data;
using backend.Dtos;
using backend.Models;

namespace backend.Services;

public sealed class SupportTicketService : ISupportTicketService
{
    private readonly List<SupportTicket> _tickets = [];
    private readonly object _sync = new();
    private int _nextId = 1;
    private int _nextNumber = 1;

    public IReadOnlyList<SupportTicketResponse> GetAll(int userId, string? status)
    {
        var user = GetUser(userId);
        SupportTicketStatus? filter = status is null ? null : ParseStatus(status);
        lock (_sync)
        {
            return _tickets
                .Where(item => user.Role == UserRole.Dispatcher || item.AssigneeUserId == user.Id)
                .Where(item => filter is null || item.Status == filter)
                .Select(ToResponse).ToArray();
        }
    }

    public SupportTicketResponse GetById(int id, int userId)
    {
        var user = GetUser(userId);
        lock (_sync)
        {
            var item = Find(id);
            EnsureVisible(item, user);
            return ToResponse(item);
        }
    }

    public SupportTicketResponse Create(CreateSupportTicketRequest request, int userId)
    {
        var user = GetUser(userId);
        EnsureDispatcher(user);
        var equipment = ReferenceData.Equipment.SingleOrDefault(item => item.Id == request.EquipmentId);
        if (equipment is null || !ReferenceData.Clients.Any(item => item.Id == equipment.ClientId))
            throw new SupportTicketException(400, "Оборудование или организация-клиент не найдены.");

        lock (_sync)
        {
            var createdAt = DateTimeOffset.UtcNow;
            var item = new SupportTicket
            {
                Id = _nextId++,
                Number = $"SUP-{createdAt.Year}-{_nextNumber++:D4}",
                Title = request.Title!,
                Description = request.Description!,
                EquipmentId = request.EquipmentId,
                CreatedByUserId = user.Id,
                CreatedAt = createdAt
            };
            _tickets.Add(item);
            return ToResponse(item);
        }
    }

    public SupportTicketResponse Assign(int id, AssignSupportTicketRequest request, int userId)
    {
        var user = GetUser(userId);
        lock (_sync)
        {
            var item = Find(id);
            EnsureDispatcher(user);
            if (item.Status != SupportTicketStatus.New)
                throw new SupportTicketException(409, "Назначение разрешено только для новой заявки.");
            if (!ReferenceData.Users.Any(candidate => candidate.Id == request.AssigneeUserId && candidate.Role == UserRole.Engineer))
                throw new SupportTicketException(400, "Укажите существующего инженера.");

            item.AssigneeUserId = request.AssigneeUserId;
            return ToResponse(item);
        }
    }

    public SupportTicketResponse ChangeStatus(int id, ChangeSupportTicketStatusRequest request, int userId)
    {
        var user = GetUser(userId);
        var target = ParseStatus(request.Status!);
        lock (_sync)
        {
            var item = Find(id);
            var canCancel = user.Role == UserRole.Dispatcher
                && target == SupportTicketStatus.Cancelled
                && item.Status is SupportTicketStatus.New or SupportTicketStatus.InProgress;
            var assignedEngineer = user.Role == UserRole.Engineer && item.AssigneeUserId == user.Id;
            var canStart = assignedEngineer && item.Status == SupportTicketStatus.New && target == SupportTicketStatus.InProgress;
            var canClose = assignedEngineer && item.Status == SupportTicketStatus.InProgress && target == SupportTicketStatus.Closed;
            if (!canCancel && !canStart && !canClose)
                throw new SupportTicketException(409, "Переход запрещён: проверьте статус заявки и назначенного исполнителя.");

            item.Status = target;
            return ToResponse(item);
        }
    }

    private static User GetUser(int id) => ReferenceData.Users.SingleOrDefault(user => user.Id == id)
        ?? throw new SupportTicketException(400, "Укажите существующего сотрудника в X-User-Id.");

    private SupportTicket Find(int id) => _tickets.SingleOrDefault(item => item.Id == id)
        ?? throw new SupportTicketException(404, "Заявка не найдена.");

    private static void EnsureDispatcher(User user)
    {
        if (user.Role != UserRole.Dispatcher)
            throw new SupportTicketException(409, "Действие доступно только диспетчеру.");
    }

    private static void EnsureVisible(SupportTicket item, User user)
    {
        if (user.Role == UserRole.Engineer && item.AssigneeUserId != user.Id)
            throw new SupportTicketException(409, "Заявка не назначена этому инженеру.");
    }

    private static SupportTicketStatus ParseStatus(string value)
    {
        if (Enum.TryParse<SupportTicketStatus>(value, out var status) && Enum.GetName(status) == value)
            return status;
        throw new SupportTicketException(400, "Допустимы New, InProgress, Closed, Cancelled.");
    }

    private static SupportTicketResponse ToResponse(SupportTicket item)
    {
        var equipment = ReferenceData.Equipment.Single(value => value.Id == item.EquipmentId);
        var client = ReferenceData.Clients.Single(value => value.Id == equipment.ClientId);
        var assignee = ReferenceData.Users.SingleOrDefault(value => value.Id == item.AssigneeUserId);
        return new SupportTicketResponse(item.Id, item.Number, item.Title, item.EquipmentId,
            equipment.Name, client.Id, client.Name, item.Description, item.Status.ToString(),
            item.CreatedByUserId, item.AssigneeUserId, assignee?.FullName, item.CreatedAt);
    }
}
