using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceNumberToPoInvoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "invoice_number",
                table: "po_invoices",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    rec RECORD;
                    counter INT := 1;
                    year_prefix TEXT := 'IN' || TO_CHAR(CURRENT_DATE, 'YY');
                BEGIN
                    FOR rec IN SELECT id FROM po_invoices WHERE invoice_number IS NULL ORDER BY id LOOP
                        UPDATE po_invoices SET invoice_number = year_prefix || LPAD(counter::TEXT, 4, '0') WHERE id = rec.id;
                        counter := counter + 1;
                    END LOOP;
                END $$;
            ");

            migrationBuilder.AlterColumn<string>(
                name: "invoice_number",
                table: "po_invoices",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_invoice_number",
                table: "po_invoices",
                column: "invoice_number",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_po_invoices_invoice_number",
                table: "po_invoices");

            migrationBuilder.DropColumn(
                name: "invoice_number",
                table: "po_invoices");
        }
    }
}
