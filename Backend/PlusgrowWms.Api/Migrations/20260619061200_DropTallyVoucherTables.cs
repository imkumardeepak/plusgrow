using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class DropTallyVoucherTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tallyvoucheritems");

            migrationBuilder.DropTable(
                name: "tallyvouchers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tallyvouchers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AccountType = table.Column<string>(type: "text", nullable: false),
                    LastUpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    OverallAmount = table.Column<string>(type: "text", nullable: false),
                    PartyName = table.Column<string>(type: "text", nullable: false),
                    RemoteId = table.Column<string>(type: "text", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    VoucherDate = table.Column<string>(type: "text", nullable: false),
                    VoucherType = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tallyvouchers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tallyvoucheritems",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tally_voucher_id = table.Column<int>(type: "integer", nullable: false),
                    actual_qty = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<string>(type: "text", nullable: false),
                    rate = table.Column<string>(type: "text", nullable: false),
                    stock_item_name = table.Column<string>(type: "text", nullable: false),
                    unit = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tallyvoucheritems", x => x.id);
                    table.ForeignKey(
                        name: "FK_tallyvoucheritems_tallyvouchers_tally_voucher_id",
                        column: x => x.tally_voucher_id,
                        principalTable: "tallyvouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tallyvoucheritems_stock_item_name",
                table: "tallyvoucheritems",
                column: "stock_item_name");

            migrationBuilder.CreateIndex(
                name: "IX_tallyvoucheritems_tally_voucher_id",
                table: "tallyvoucheritems",
                column: "tally_voucher_id");

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
    }
}
