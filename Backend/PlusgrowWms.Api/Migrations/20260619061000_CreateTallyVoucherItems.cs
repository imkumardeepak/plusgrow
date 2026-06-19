using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class CreateTallyVoucherItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tallyvoucheritems",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tally_voucher_id = table.Column<int>(type: "integer", nullable: false),
                    stock_item_name = table.Column<string>(type: "text", nullable: false),
                    rate = table.Column<string>(type: "text", nullable: false),
                    amount = table.Column<string>(type: "text", nullable: false),
                    actual_qty = table.Column<string>(type: "text", nullable: false),
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

            migrationBuilder.Sql("""
                INSERT INTO tallyvoucheritems (tally_voucher_id, stock_item_name, rate, amount, actual_qty, unit)
                SELECT
                    tv."Id",
                    COALESCE(item ->> 'StockItemName', 'NA'),
                    COALESCE(item ->> 'Rate', 'NA'),
                    COALESCE(item ->> 'Amount', 'NA'),
                    COALESCE(item ->> 'ActualQty', 'NA'),
                    COALESCE(item ->> 'Unit', 'NA')
                FROM tallyvouchers tv
                CROSS JOIN LATERAL jsonb_array_elements(tv."Items") AS item
                WHERE jsonb_typeof(tv."Items") = 'array';
                """);

            migrationBuilder.DropColumn(
                name: "Items",
                table: "tallyvouchers");

            migrationBuilder.CreateIndex(
                name: "IX_tallyvoucheritems_stock_item_name",
                table: "tallyvoucheritems",
                column: "stock_item_name");

            migrationBuilder.CreateIndex(
                name: "IX_tallyvoucheritems_tally_voucher_id",
                table: "tallyvoucheritems",
                column: "tally_voucher_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<TallyERPWebApi.Model.ItemDetails>>(
                name: "Items",
                table: "tallyvouchers",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");

            migrationBuilder.Sql("""
                UPDATE tallyvouchers tv
                SET "Items" = COALESCE(items.items_json, '[]'::jsonb)
                FROM (
                    SELECT
                        tally_voucher_id,
                        jsonb_agg(
                            jsonb_build_object(
                                'StockItemName', stock_item_name,
                                'Rate', rate,
                                'Amount', amount,
                                'ActualQty', actual_qty,
                                'Unit', unit
                            )
                            ORDER BY id
                        ) AS items_json
                    FROM tallyvoucheritems
                    GROUP BY tally_voucher_id
                ) items
                WHERE tv."Id" = items.tally_voucher_id;
                """);

            migrationBuilder.DropTable(
                name: "tallyvoucheritems");
        }
    }
}
