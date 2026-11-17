using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Equipment> Equipment => Set<Equipment>();
    public DbSet<User> Users => Set<User>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasSequence<long>("support_ticket_number_seq");

        modelBuilder.Entity<Client>(entity =>
        {
            entity.ToTable("clients", table =>
            {
                table.HasCheckConstraint("clients_id_check", "id > 0");
                table.HasCheckConstraint("clients_name_check", "btrim(name) <> ''");
            });
            entity.HasKey(item => item.Id).HasName("clients_pkey");
            entity.Property(item => item.Id).HasColumnName("id").UseIdentityByDefaultColumn().HasIdentityOptions(startValue: 5);
            entity.Property(item => item.Name).HasColumnName("name").IsRequired();
            entity.HasData(ReferenceData.Clients);
        });

        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.ToTable("equipment", table =>
            {
                table.HasCheckConstraint("equipment_id_check", "id > 0");
                table.HasCheckConstraint("equipment_name_check", "btrim(name) <> ''");
            });
            entity.HasKey(item => item.Id).HasName("equipment_pkey");
            entity.Property(item => item.Id).HasColumnName("id").UseIdentityByDefaultColumn().HasIdentityOptions(startValue: 9);
            entity.Property(item => item.Name).HasColumnName("name").IsRequired();
            entity.Property(item => item.ClientId).HasColumnName("client_id");
            entity.HasOne<Client>().WithMany().HasForeignKey(item => item.ClientId)
                .OnDelete(DeleteBehavior.Restrict).HasConstraintName("equipment_client_id_fkey");
            entity.HasData(ReferenceData.Equipment);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users", table =>
            {
                table.HasCheckConstraint("users_id_check", "id > 0");
                table.HasCheckConstraint("users_login_check", "btrim(login) <> ''");
                table.HasCheckConstraint("users_full_name_check", "btrim(full_name) <> ''");
                table.HasCheckConstraint("users_role_check", "role IN ('Dispatcher', 'Engineer')");
                table.HasCheckConstraint("users_password_hash_check", "btrim(password_hash) <> ''");
            });
            entity.HasKey(item => item.Id).HasName("users_pkey");
            entity.Property(item => item.Id).HasColumnName("id").UseIdentityByDefaultColumn().HasIdentityOptions(startValue: 4);
            entity.Property(item => item.Login).HasColumnName("login").IsRequired();
            entity.HasIndex(item => item.Login).IsUnique().HasDatabaseName("users_login_key");
            entity.Property(item => item.FullName).HasColumnName("full_name").IsRequired();
            entity.Property(item => item.Role).HasColumnName("role").HasConversion<string>().HasMaxLength(16);
            entity.Property(item => item.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.HasData(ReferenceData.Users);
        });

        modelBuilder.Entity<SupportTicket>(entity =>
        {
            entity.ToTable("support_tickets", table =>
            {
                table.HasCheckConstraint("support_tickets_id_check", "id > 0");
                table.HasCheckConstraint("support_tickets_number_check", "btrim(number) <> ''");
                table.HasCheckConstraint("support_tickets_title_check", "title = btrim(title) AND char_length(title) BETWEEN 5 AND 80");
                table.HasCheckConstraint("support_tickets_description_check", "description = btrim(description) AND char_length(description) BETWEEN 10 AND 500");
                table.HasCheckConstraint("support_tickets_status_check", "status IN ('New', 'InProgress', 'Closed', 'Cancelled')");
            });
            entity.HasKey(item => item.Id).HasName("support_tickets_pkey");
            entity.Property(item => item.Id).HasColumnName("id").UseIdentityByDefaultColumn();
            entity.Property(item => item.Number).HasColumnName("number").HasMaxLength(32).IsRequired();
            entity.HasIndex(item => item.Number).IsUnique().HasDatabaseName("support_tickets_number_key");
            entity.Property(item => item.Title).HasColumnName("title").HasMaxLength(80).IsRequired();
            entity.Property(item => item.Description).HasColumnName("description").HasMaxLength(500).IsRequired();
            entity.Property(item => item.EquipmentId).HasColumnName("equipment_id");
            entity.Property(item => item.Status).HasColumnName("status").HasConversion<string>()
                .HasMaxLength(16).HasDefaultValue(SupportTicketStatus.New);
            entity.Property(item => item.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(item => item.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(item => item.AssigneeUserId).HasColumnName("assignee_user_id");
            entity.HasOne<Equipment>().WithMany().HasForeignKey(item => item.EquipmentId)
                .OnDelete(DeleteBehavior.Restrict).HasConstraintName("support_tickets_equipment_id_fkey");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict).HasConstraintName("support_tickets_created_by_user_id_fkey");
            entity.HasOne<User>().WithMany().HasForeignKey(item => item.AssigneeUserId)
                .OnDelete(DeleteBehavior.Restrict).HasConstraintName("support_tickets_assignee_user_id_fkey");
            entity.HasIndex(item => item.Status).HasDatabaseName("support_tickets_status_idx");
            entity.HasIndex(item => item.EquipmentId).HasDatabaseName("support_tickets_equipment_id_idx");
        });
    }
}
