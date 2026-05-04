using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLongTermPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_po_invoices_product_id",
                table: "po_invoices");

            migrationBuilder.CreateIndex(
                name: "IX_product_quantities_current_quantity",
                table: "product_quantities",
                column: "current_quantity");

            migrationBuilder.CreateIndex(
                name: "IX_product_allotted_locations_updated_at",
                table: "product_allotted_locations",
                column: "updated_at");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_location_allotted",
                table: "po_invoices",
                column: "location_allotted");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_printed",
                table: "po_invoices",
                column: "printed");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_product_id_remaining_allocation_invoice_date",
                table: "po_invoices",
                columns: new[] { "product_id", "remaining_allocation", "invoice_date" });

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_remaining_allocation",
                table: "po_invoices",
                column: "remaining_allocation");

            migrationBuilder.CreateIndex(
                name: "IX_outward_orders_status_order_date",
                table: "outward_orders",
                columns: new[] { "status", "order_date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_product_quantities_current_quantity",
                table: "product_quantities");

            migrationBuilder.DropIndex(
                name: "IX_product_allotted_locations_updated_at",
                table: "product_allotted_locations");

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_location_allotted",
                table: "po_invoices");

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_printed",
                table: "po_invoices");

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_product_id_remaining_allocation_invoice_date",
                table: "po_invoices");

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_remaining_allocation",
                table: "po_invoices");

            migrationBuilder.DropIndex(
                name: "IX_outward_orders_status_order_date",
                table: "outward_orders");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_product_id",
                table: "po_invoices",
                column: "product_id");
        }
    }
}
