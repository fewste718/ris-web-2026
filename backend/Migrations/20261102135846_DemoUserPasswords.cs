using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class DemoUserPasswords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "users",
                keyColumn: "id",
                keyValue: 1,
                column: "password_hash",
                value: "AQAAAAIAAYagAAAAEN1XHvHfeLR/CvM4gt4xOSGZdD/PTlkrf+DENnFw0ME0PwYU/49gNFgYpEiHY1o4Vg==");

            migrationBuilder.UpdateData(
                table: "users",
                keyColumn: "id",
                keyValue: 2,
                column: "password_hash",
                value: "AQAAAAIAAYagAAAAEG+oQQiyvY0yNwPyyZQ6tX4ZGn7dtZipnqC5Ae26AL0u1hKeGjkh9YllT0BheZZWew==");

            migrationBuilder.UpdateData(
                table: "users",
                keyColumn: "id",
                keyValue: 3,
                column: "password_hash",
                value: "AQAAAAIAAYagAAAAEBSoxAMxx8AI9sdz8fZqswutM4jyH0x/4F3YavGfT7w9H0mjE9qpG5syTPZCTe06LA==");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "users",
                keyColumn: "id",
                keyValue: 1,
                column: "password_hash",
                value: "AQAAAAIAAYagAAAAED3dul177ZRdcM8wAY6JtCPPMYLXttLpfDYgmWPcSlXBDhwxYzIqrgSm3U0OxTEpZg==");

            migrationBuilder.UpdateData(
                table: "users",
                keyColumn: "id",
                keyValue: 2,
                column: "password_hash",
                value: "AQAAAAIAAYagAAAAEJ5xGucLBig6fYmt3HmipYZUmBZ/8ijoami07slzi6oS14898dubiWVvl8kbD9E/XQ==");

            migrationBuilder.UpdateData(
                table: "users",
                keyColumn: "id",
                keyValue: 3,
                column: "password_hash",
                value: "AQAAAAIAAYagAAAAEPegoACPr2Pzpiofk6omGhLgjUdllVW1tUQryLB+6W5geGgFbH0gx/1b0lxNr7NPCg==");
        }
    }
}
