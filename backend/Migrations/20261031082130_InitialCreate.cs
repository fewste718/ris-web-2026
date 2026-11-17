using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "support_ticket_number_seq");

            migrationBuilder.CreateTable(
                name: "clients",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:IdentitySequenceOptions", "'5', '1', '', '', 'False', '1'")
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("clients_pkey", x => x.id);
                    table.CheckConstraint("clients_id_check", "id > 0");
                    table.CheckConstraint("clients_name_check", "btrim(name) <> ''");
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:IdentitySequenceOptions", "'4', '1', '', '', 'False', '1'")
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    login = table.Column<string>(type: "text", nullable: false),
                    full_name = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("users_pkey", x => x.id);
                    table.CheckConstraint("users_full_name_check", "btrim(full_name) <> ''");
                    table.CheckConstraint("users_id_check", "id > 0");
                    table.CheckConstraint("users_login_check", "btrim(login) <> ''");
                    table.CheckConstraint("users_password_hash_check", "btrim(password_hash) <> ''");
                    table.CheckConstraint("users_role_check", "role IN ('Dispatcher', 'Engineer')");
                });

            migrationBuilder.CreateTable(
                name: "equipment",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:IdentitySequenceOptions", "'9', '1', '', '', 'False', '1'")
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    client_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("equipment_pkey", x => x.id);
                    table.CheckConstraint("equipment_id_check", "id > 0");
                    table.CheckConstraint("equipment_name_check", "btrim(name) <> ''");
                    table.ForeignKey(
                        name: "equipment_client_id_fkey",
                        column: x => x.client_id,
                        principalTable: "clients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "support_tickets",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    number = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    title = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    equipment_id = table.Column<int>(type: "integer", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false, defaultValue: "New"),
                    assignee_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("support_tickets_pkey", x => x.id);
                    table.CheckConstraint("support_tickets_description_check", "description = btrim(description) AND char_length(description) BETWEEN 10 AND 500");
                    table.CheckConstraint("support_tickets_id_check", "id > 0");
                    table.CheckConstraint("support_tickets_number_check", "btrim(number) <> ''");
                    table.CheckConstraint("support_tickets_status_check", "status IN ('New', 'InProgress', 'Closed', 'Cancelled')");
                    table.CheckConstraint("support_tickets_title_check", "title = btrim(title) AND char_length(title) BETWEEN 5 AND 80");
                    table.ForeignKey(
                        name: "support_tickets_assignee_user_id_fkey",
                        column: x => x.assignee_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "support_tickets_created_by_user_id_fkey",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "support_tickets_equipment_id_fkey",
                        column: x => x.equipment_id,
                        principalTable: "equipment",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "clients",
                columns: new[] { "id", "name" },
                values: new object[,]
                {
                    { 3, "Клиент А" },
                    { 4, "Клиент Б" }
                });

            migrationBuilder.InsertData(
                table: "users",
                columns: new[] { "id", "full_name", "login", "password_hash", "role" },
                values: new object[,]
                {
                    { 1, "Диспетчер 1", "dispatcher1", "AQAAAAIAAYagAAAAED3dul177ZRdcM8wAY6JtCPPMYLXttLpfDYgmWPcSlXBDhwxYzIqrgSm3U0OxTEpZg==", "Dispatcher" },
                    { 2, "Инженер 1", "engineer1", "AQAAAAIAAYagAAAAEJ5xGucLBig6fYmt3HmipYZUmBZ/8ijoami07slzi6oS14898dubiWVvl8kbD9E/XQ==", "Engineer" },
                    { 3, "Инженер 2", "engineer2", "AQAAAAIAAYagAAAAEPegoACPr2Pzpiofk6omGhLgjUdllVW1tUQryLB+6W5geGgFbH0gx/1b0lxNr7NPCg==", "Engineer" }
                });

            migrationBuilder.InsertData(
                table: "equipment",
                columns: new[] { "id", "client_id", "name" },
                values: new object[,]
                {
                    { 7, 3, "Сетевой принтер 01" },
                    { 8, 4, "Файловый сервер 01" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_equipment_client_id",
                table: "equipment",
                column: "client_id");

            migrationBuilder.CreateIndex(
                name: "IX_support_tickets_assignee_user_id",
                table: "support_tickets",
                column: "assignee_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_support_tickets_created_by_user_id",
                table: "support_tickets",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "support_tickets_equipment_id_idx",
                table: "support_tickets",
                column: "equipment_id");

            migrationBuilder.CreateIndex(
                name: "support_tickets_number_key",
                table: "support_tickets",
                column: "number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "support_tickets_status_idx",
                table: "support_tickets",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "users_login_key",
                table: "users",
                column: "login",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "support_tickets");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "equipment");

            migrationBuilder.DropTable(
                name: "clients");

            migrationBuilder.DropSequence(
                name: "support_ticket_number_seq");
        }
    }
}
