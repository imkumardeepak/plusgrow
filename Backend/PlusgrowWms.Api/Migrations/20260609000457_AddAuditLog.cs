using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "auditlogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    Username = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OldValues = table.Column<string>(type: "jsonb", nullable: true),
                    NewValues = table.Column<string>(type: "jsonb", nullable: true),
                    Details = table.Column<string>(type: "text", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditlogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "stock_check_reports",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    check_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    reference_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    total_system_qty = table.Column<int>(type: "integer", nullable: false),
                    total_scanned_qty = table.Column<int>(type: "integer", nullable: false),
                    total_variance = table.Column<int>(type: "integer", nullable: false),
                    items_checked = table.Column<int>(type: "integer", nullable: false),
                    items_with_variance = table.Column<int>(type: "integer", nullable: false),
                    items_json = table.Column<string>(type: "jsonb", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "COMPLETED"),
                    notes = table.Column<string>(type: "text", nullable: true),
                    performed_by_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    performed_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_check_reports", x => x.id);
                    table.ForeignKey(
                        name: "FK_stock_check_reports_users_performed_by_user_id",
                        column: x => x.performed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_auditlogs_Action",
                table: "auditlogs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_auditlogs_EntityType",
                table: "auditlogs",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_auditlogs_Timestamp",
                table: "auditlogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_stock_check_reports_check_type",
                table: "stock_check_reports",
                column: "check_type");

            migrationBuilder.CreateIndex(
                name: "IX_stock_check_reports_created_at",
                table: "stock_check_reports",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_stock_check_reports_performed_by_user_id",
                table: "stock_check_reports",
                column: "performed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_check_reports_status",
                table: "stock_check_reports",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auditlogs");

            migrationBuilder.DropTable(
                name: "stock_check_reports");
        }
    }
}
