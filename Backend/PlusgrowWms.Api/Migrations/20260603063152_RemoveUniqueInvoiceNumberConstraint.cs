using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUniqueInvoiceNumberConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_po_invoice_headers_invoice_number",
                table: "po_invoice_headers");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoice_headers_invoice_number",
                table: "po_invoice_headers",
                column: "invoice_number");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_po_invoice_headers_invoice_number",
                table: "po_invoice_headers");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoice_headers_invoice_number",
                table: "po_invoice_headers",
                column: "invoice_number",
                unique: true);
        }
    }
}
