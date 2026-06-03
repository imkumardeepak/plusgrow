using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class MovePoInvoiceCancelStatusToHeader : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "cancel_remark",
                table: "po_invoice_headers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "po_invoice_headers",
                type: "text",
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.Sql("""
                UPDATE po_invoice_headers h
                SET status = 'Canceled',
                    cancel_remark = s.cancel_remark
                FROM (
                    SELECT po_invoice_header_id,
                           MAX(cancel_remark) FILTER (WHERE cancel_remark IS NOT NULL AND cancel_remark <> '') AS cancel_remark
                    FROM po_invoices
                    WHERE status = 'Canceled'
                    GROUP BY po_invoice_header_id
                ) s
                WHERE h.id = s.po_invoice_header_id;
                """);

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_status",
                table: "po_invoices");

            migrationBuilder.DropColumn(
                name: "cancel_remark",
                table: "po_invoices");

            migrationBuilder.DropColumn(
                name: "status",
                table: "po_invoices");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoice_headers_status",
                table: "po_invoice_headers",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_po_invoice_headers_status",
                table: "po_invoice_headers");

            migrationBuilder.DropColumn(
                name: "cancel_remark",
                table: "po_invoice_headers");

            migrationBuilder.DropColumn(
                name: "status",
                table: "po_invoice_headers");

            migrationBuilder.AddColumn<string>(
                name: "cancel_remark",
                table: "po_invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "po_invoices",
                type: "text",
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.Sql("""
                UPDATE po_invoices i
                SET status = 'Canceled',
                    cancel_remark = h.cancel_remark
                FROM po_invoice_headers h
                WHERE i.po_invoice_header_id = h.id
                  AND h.status = 'Canceled';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_status",
                table: "po_invoices",
                column: "status");
        }
    }
}
