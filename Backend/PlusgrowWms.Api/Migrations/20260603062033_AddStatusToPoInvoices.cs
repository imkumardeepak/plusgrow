using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusToPoInvoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.Sql("UPDATE po_invoices SET status = CASE WHEN printed THEN 'Printed' ELSE 'Pending' END");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_status",
                table: "po_invoices",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_po_invoices_status",
                table: "po_invoices");

            migrationBuilder.DropColumn(
                name: "cancel_remark",
                table: "po_invoices");

            migrationBuilder.DropColumn(
                name: "status",
                table: "po_invoices");
        }
    }
}
