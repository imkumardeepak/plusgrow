using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConvertSalesOrderHeader : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sales_orders",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_number = table.Column<string>(type: "text", nullable: false),
                    order_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    customer_name = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    dispatched_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_orders", x => x.id);
                });

            migrationBuilder.Sql("""
                INSERT INTO sales_orders (order_number, order_date, customer_name, status, notes, created_at, updated_at, dispatched_at)
                SELECT
                    order_number,
                    MIN(order_date) AS order_date,
                    MIN(customer_name) AS customer_name,
                    CASE
                        WHEN BOOL_AND(status = 'Dispatched') THEN 'Dispatched'
                        WHEN BOOL_AND(status IN ('Packed', 'Dispatched')) THEN 'Packed'
                        WHEN BOOL_OR(status = 'Picking' OR picked_quantity > 0) THEN 'Picking'
                        ELSE 'Open'
                    END AS status,
                    MAX(notes) AS notes,
                    MIN(created_at) AS created_at,
                    MAX(updated_at) AS updated_at,
                    MAX(dispatched_at) AS dispatched_at
                FROM outward_orders
                GROUP BY order_number;
                """);

            migrationBuilder.AddColumn<int>(
                name: "sales_order_id",
                table: "outward_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE outward_orders oo
                SET sales_order_id = so.id
                FROM sales_orders so
                WHERE so.order_number = oo.order_number;
                """);

            migrationBuilder.DropIndex(
                name: "IX_outward_orders_order_number",
                table: "outward_orders");

            migrationBuilder.AlterColumn<int>(
                name: "sales_order_id",
                table: "outward_orders",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.RenameTable(
                name: "outward_orders",
                newName: "sales_order_items");

            migrationBuilder.CreateIndex(
                name: "IX_sales_order_items_order_number",
                table: "sales_order_items",
                column: "order_number");

            migrationBuilder.CreateIndex(
                name: "IX_sales_order_items_sales_order_id",
                table: "sales_order_items",
                column: "sales_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_orders_order_number",
                table: "sales_orders",
                column: "order_number",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_sales_order_items_sales_orders_sales_order_id",
                table: "sales_order_items",
                column: "sales_order_id",
                principalTable: "sales_orders",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sales_order_items_sales_orders_sales_order_id",
                table: "sales_order_items");

            migrationBuilder.DropIndex(
                name: "IX_sales_order_items_order_number",
                table: "sales_order_items");

            migrationBuilder.DropIndex(
                name: "IX_sales_order_items_sales_order_id",
                table: "sales_order_items");

            migrationBuilder.RenameTable(
                name: "sales_order_items",
                newName: "outward_orders");

            migrationBuilder.DropColumn(
                name: "sales_order_id",
                table: "outward_orders");

            migrationBuilder.DropTable(
                name: "sales_orders");

            migrationBuilder.CreateIndex(
                name: "IX_outward_orders_order_number",
                table: "outward_orders",
                column: "order_number",
                unique: true);
        }
    }
}
