using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using TallyERPWebApi.Model;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTallyVouchers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tallyvouchers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RemoteId = table.Column<string>(type: "text", nullable: false),
                    VoucherType = table.Column<string>(type: "text", nullable: false),
                    VoucherDate = table.Column<string>(type: "text", nullable: false),
                    PartyName = table.Column<string>(type: "text", nullable: false),
                    AccountType = table.Column<string>(type: "text", nullable: false),
                    OverallAmount = table.Column<string>(type: "text", nullable: false),
                    Items = table.Column<List<ItemDetails>>(type: "jsonb", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tallyvouchers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tallyvouchers_RemoteId",
                table: "tallyvouchers",
                column: "RemoteId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tallyvouchers_SyncedAt",
                table: "tallyvouchers",
                column: "SyncedAt");

            migrationBuilder.CreateIndex(
                name: "IX_tallyvouchers_VoucherDate",
                table: "tallyvouchers",
                column: "VoucherDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tallyvouchers");
        }
    }
}
