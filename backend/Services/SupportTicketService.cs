using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.Services;

public sealed class SupportTicketService(AppDbContext db) : ISupportTicketService
{
    public async Task<IReadOnlyList<SupportTicketResponse>> GetAll(int userId, string? status, CancellationToken cancellationToken)
    {
        var user = await GetUser(userId, cancellationToken);
        SupportTicketStatus? filter = status is null ? null : ParseStatus(status);
        var tickets = db.SupportTickets.AsNoTracking();
        if (user.Role == UserRole.Engineer)
            tickets = tickets.Where(item => item.AssigneeUserId == user.Id);
        if (filter is not null)
            tickets = tickets.Where(item => item.Status == filter);
        return await Responses(tickets.OrderBy(item => item.Id)).ToArrayAsync(cancellationToken);
    }

    public async Task<SupportTicketResponse> GetById(int id, int userId, CancellationToken cancellationToken)
    {
        var user = await GetUser(userId, cancellationToken);
        var item = await Responses(db.SupportTickets.AsNoTracking().Where(item => item.Id == id))
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new SupportTicketException(404, "Заявка не найдена.");
        if (user.Role == UserRole.Engineer && item.AssigneeUserId != user.Id)
            throw new SupportTicketException(409, "Заявка не назначена этому инженеру.");
        return item;
    }

    public async Task<SupportTicketResponse> Create(CreateSupportTicketRequest request, int userId, CancellationToken cancellationToken)
    {
        var user = await GetUser(userId, cancellationToken);
        EnsureDispatcher(user);
        if (!await db.Equipment.AnyAsync(item => item.Id == request.EquipmentId
            && db.Clients.Any(client => client.Id == item.ClientId), cancellationToken))
            throw new SupportTicketException(400, "Оборудование или организация-клиент не найдены.");

        // Последовательность PostgreSQL сохраняется между запусками и безопасна при параллельных POST.
        var serial = await db.Database.SqlQueryRaw<long>(
            "SELECT nextval('support_ticket_number_seq') AS \"Value\"").SingleAsync(cancellationToken);
        var createdAt = DateTimeOffset.UtcNow;
        var item = new SupportTicket
        {
            Number = $"SUP-{createdAt.Year}-{serial:D4}",
            Title = request.Title!, Description = request.Description!,
            EquipmentId = request.EquipmentId, CreatedByUserId = user.Id, CreatedAt = createdAt
        };
        db.SupportTickets.Add(item);
        await Save(cancellationToken);
        return await Response(item.Id, cancellationToken);
    }

    public async Task<SupportTicketResponse> Assign(int id, AssignSupportTicketRequest request, int userId, CancellationToken cancellationToken)
    {
        var user = await GetUser(userId, cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var item = await FindForUpdate(id, cancellationToken);
        EnsureDispatcher(user);
        if (item.Status != SupportTicketStatus.New)
            throw new SupportTicketException(409, "Назначение разрешено только для новой заявки.");
        if (!await db.Users.AnyAsync(candidate => candidate.Id == request.AssigneeUserId
            && candidate.Role == UserRole.Engineer, cancellationToken))
            throw new SupportTicketException(400, "Укажите существующего инженера.");
        item.AssigneeUserId = request.AssigneeUserId;
        await Save(cancellationToken);
        var result = await Response(id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }

    public async Task<SupportTicketResponse> ChangeStatus(int id, ChangeSupportTicketStatusRequest request, int userId, CancellationToken cancellationToken)
    {
        var user = await GetUser(userId, cancellationToken);
        var target = ParseStatus(request.Status!);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var item = await FindForUpdate(id, cancellationToken);
        var canCancel = user.Role == UserRole.Dispatcher && target == SupportTicketStatus.Cancelled
            && item.Status is SupportTicketStatus.New or SupportTicketStatus.InProgress;
        var assignedEngineer = user.Role == UserRole.Engineer && item.AssigneeUserId == user.Id;
        var canStart = assignedEngineer && item.Status == SupportTicketStatus.New && target == SupportTicketStatus.InProgress;
        var canClose = assignedEngineer && item.Status == SupportTicketStatus.InProgress && target == SupportTicketStatus.Closed;
        if (!canCancel && !canStart && !canClose)
            throw new SupportTicketException(409, "Переход запрещён: проверьте статус заявки и назначенного исполнителя.");
        item.Status = target;
        await Save(cancellationToken);
        var result = await Response(id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }

    private async Task<ActingUser> GetUser(int id, CancellationToken cancellationToken) =>
        await db.Users.AsNoTracking().Where(user => user.Id == id)
            .Select(user => new ActingUser(user.Id, user.Role)).SingleOrDefaultAsync(cancellationToken)
        ?? throw new SupportTicketException(400, "Укажите существующего сотрудника в X-User-Id.");

    private async Task<SupportTicket> FindForUpdate(int id, CancellationToken cancellationToken) =>
        // Блокировка строки не даёт двум PATCH одновременно проверить устаревший статус.
        await db.SupportTickets.FromSqlInterpolated($"SELECT * FROM support_tickets WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken)
        ?? throw new SupportTicketException(404, "Заявка не найдена.");

    private async Task Save(CancellationToken cancellationToken)
    {
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "support_tickets_number_key" })
        {
            throw new SupportTicketException(409, "Заявка с таким номером уже существует.");
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.ForeignKeyViolation })
        {
            throw new SupportTicketException(400, "Оборудование или сотрудник не найдены.");
        }
    }

    private static void EnsureDispatcher(ActingUser user)
    {
        if (user.Role != UserRole.Dispatcher)
            throw new SupportTicketException(409, "Действие доступно только диспетчеру.");
    }

    private static SupportTicketStatus ParseStatus(string value)
    {
        if (Enum.TryParse<SupportTicketStatus>(value, out var status) && Enum.GetName(status) == value)
            return status;
        throw new SupportTicketException(400, "Допустимы New, InProgress, Closed, Cancelled.");
    }

    private Task<SupportTicketResponse> Response(int id, CancellationToken cancellationToken) =>
        Responses(db.SupportTickets.AsNoTracking().Where(item => item.Id == id)).SingleAsync(cancellationToken);

    private IQueryable<SupportTicketResponse> Responses(IQueryable<SupportTicket> tickets) =>
        from ticket in tickets
        join equipment in db.Equipment on ticket.EquipmentId equals equipment.Id
        join client in db.Clients on equipment.ClientId equals client.Id
        join engineer in db.Users on ticket.AssigneeUserId equals (int?)engineer.Id into engineers
        from assignee in engineers.DefaultIfEmpty()
        select new SupportTicketResponse(ticket.Id, ticket.Number, ticket.Title, ticket.EquipmentId,
            equipment.Name, client.Id, client.Name, ticket.Description, ticket.Status.ToString(),
            ticket.CreatedByUserId, ticket.AssigneeUserId, assignee == null ? null : assignee.FullName, ticket.CreatedAt);

    private sealed record ActingUser(int Id, UserRole Role);
}
