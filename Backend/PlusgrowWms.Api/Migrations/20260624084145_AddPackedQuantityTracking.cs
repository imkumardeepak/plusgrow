using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPackedQuantityTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "packed_quantity",
                table: "sales_order_items",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(
                """
                UPDATE sales_order_items
                SET packed_quantity = picked_quantity
                WHERE status IN ('Packed', 'Dispatched');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "packed_quantity",
                table: "sales_order_items");
        }
    }
}
