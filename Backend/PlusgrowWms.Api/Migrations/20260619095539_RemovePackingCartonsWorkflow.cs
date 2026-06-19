using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemovePackingCartonsWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE sales_order_items item
                SET status = 'Picked',
                    updated_at = NOW()
                WHERE item.status = 'Packed'
                  AND COALESCE((
                      SELECT SUM(carton.quantity)
                      FROM packing_cartons carton
                      WHERE carton.outward_order_id = item.id
                        AND carton.status IN ('Ready', 'Dispatched')
                  ), 0) < item.quantity;
                """);

            migrationBuilder.Sql("""
                UPDATE sales_orders sales_order
                SET status = 'Picked',
                    updated_at = NOW()
                WHERE sales_order.status = 'Packed'
                  AND EXISTS (
                      SELECT 1
                      FROM sales_order_items item
                      WHERE item.sales_order_id = sales_order.id
                        AND item.status = 'Picked'
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM sales_order_items item
                      WHERE item.sales_order_id = sales_order.id
                        AND item.status NOT IN ('Picked', 'Packed', 'Canceled')
                  );
                """);

            migrationBuilder.DropTable(
                name: "packing_cartons");

            migrationBuilder.DropColumn(
                name: "carton_id",
                table: "sales_order_items");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "carton_id",
                table: "sales_order_items",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "packing_cartons",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    outward_order_id = table.Column<int>(type: "integer", nullable: false),
                    carton_number = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_packing_cartons", x => x.id);
                    table.ForeignKey(
                        name: "FK_packing_cartons_sales_order_items_outward_order_id",
                        column: x => x.outward_order_id,
                        principalTable: "sales_order_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_packing_cartons_carton_number",
                table: "packing_cartons",
                column: "carton_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_packing_cartons_outward_order_id",
                table: "packing_cartons",
                column: "outward_order_id");
        }
    }
}
