using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPoInvoiceHeaders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "po_invoice_headers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    invoice_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    invoice_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    party_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_po_invoice_headers", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_po_invoice_headers_invoice_date",
                table: "po_invoice_headers",
                column: "invoice_date");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoice_headers_invoice_number",
                table: "po_invoice_headers",
                column: "invoice_number",
                unique: true);

            migrationBuilder.AddColumn<int?>(
                name: "po_invoice_header_id",
                table: "po_invoices",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                INSERT INTO po_invoice_headers (invoice_number, invoice_date, party_name, created_at)
                SELECT DISTINCT invoice_number, invoice_date, party_name, MIN(created_at)
                FROM po_invoices
                GROUP BY invoice_number, invoice_date, party_name;
                """);

            migrationBuilder.Sql("""
                UPDATE po_invoices AS pi
                SET po_invoice_header_id = poh.id
                FROM po_invoice_headers AS poh
                WHERE pi.invoice_number = poh.invoice_number
                  AND pi.invoice_date = poh.invoice_date
                  AND pi.party_name = poh.party_name;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "po_invoice_header_id",
                table: "po_invoices",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_invoice_date_product_id",
                table: "po_invoices");

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_invoice_number",
                table: "po_invoices");

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_product_id_remaining_allocation_invoice_date",
                table: "po_invoices");

            migrationBuilder.DropColumn(
                name: "invoice_date",
                table: "po_invoices");

            migrationBuilder.DropColumn(
                name: "invoice_number",
                table: "po_invoices");

            migrationBuilder.DropColumn(
                name: "party_name",
                table: "po_invoices");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_po_invoice_header_id_product_id",
                table: "po_invoices",
                columns: new[] { "po_invoice_header_id", "product_id" });

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_product_id_remaining_allocation_po_invoice_head~",
                table: "po_invoices",
                columns: new[] { "product_id", "remaining_allocation", "po_invoice_header_id" });

            migrationBuilder.AddForeignKey(
                name: "FK_po_invoices_po_invoice_headers_po_invoice_header_id",
                table: "po_invoices",
                column: "po_invoice_header_id",
                principalTable: "po_invoice_headers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_po_invoices_po_invoice_headers_po_invoice_header_id",
                table: "po_invoices");

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_po_invoice_header_id_product_id",
                table: "po_invoices");

            migrationBuilder.DropIndex(
                name: "IX_po_invoices_product_id_remaining_allocation_po_invoice_head~",
                table: "po_invoices");

            migrationBuilder.AddColumn<DateTime>(
                name: "invoice_date",
                table: "po_invoices",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "invoice_number",
                table: "po_invoices",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "party_name",
                table: "po_invoices",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                WITH numbered_invoices AS (
                    SELECT
                        pi.id,
                        poh.invoice_date,
                        poh.party_name,
                        poh.invoice_number,
                        ROW_NUMBER() OVER (PARTITION BY poh.invoice_number ORDER BY pi.id) AS rn
                    FROM po_invoices AS pi
                    INNER JOIN po_invoice_headers AS poh ON poh.id = pi.po_invoice_header_id
                )
                UPDATE po_invoices AS pi
                SET invoice_date = ni.invoice_date,
                    party_name = ni.party_name,
                    invoice_number = CASE
                        WHEN ni.rn = 1 THEN ni.invoice_number
                        ELSE LEFT(ni.invoice_number, 11) || '-' || pi.id::text
                    END
                FROM numbered_invoices AS ni
                WHERE pi.id = ni.id;
                """);

            migrationBuilder.DropColumn(
                name: "po_invoice_header_id",
                table: "po_invoices");

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_invoice_date_product_id",
                table: "po_invoices",
                columns: new[] { "invoice_date", "product_id" });

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_invoice_number",
                table: "po_invoices",
                column: "invoice_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_product_id_remaining_allocation_invoice_date",
                table: "po_invoices",
                columns: new[] { "product_id", "remaining_allocation", "invoice_date" });

            migrationBuilder.DropTable(
                name: "po_invoice_headers");
        }
    }
}
