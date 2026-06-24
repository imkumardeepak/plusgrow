using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVerifiedQuantityToPoInvoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "verified_quantity",
                table: "po_invoices",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH latest_reports AS (
                    SELECT DISTINCT ON (
                        LOWER(notes::jsonb ->> 'referenceName'),
                        LOWER(notes::jsonb ->> 'partyName'),
                        notes::jsonb ->> 'invoiceDate'
                    )
                        notes::jsonb AS notes_json,
                        items_json::jsonb AS items_json
                    FROM stock_check_reports
                    WHERE check_type = 'INWARD_VERIFY'
                      AND status = 'COMPLETED'
                      AND notes IS NOT NULL
                      AND notes LIKE '{%'
                    ORDER BY
                        LOWER(notes::jsonb ->> 'referenceName'),
                        LOWER(notes::jsonb ->> 'partyName'),
                        notes::jsonb ->> 'invoiceDate',
                        created_at DESC
                ),
                verified_rows AS (
                    SELECT
                        header.id AS header_id,
                        (item ->> 'productId')::integer AS product_id,
                        SUM(COALESCE((item ->> 'scannedQty')::integer, 0)) AS verified_quantity
                    FROM latest_reports report
                    JOIN po_invoice_headers header
                      ON LOWER(header.invoice_number) = LOWER(report.notes_json ->> 'referenceName')
                     AND LOWER(header.party_name) = LOWER(report.notes_json ->> 'partyName')
                     AND header.invoice_date::date = (report.notes_json ->> 'invoiceDate')::date
                    CROSS JOIN LATERAL jsonb_array_elements(report.items_json) item
                    WHERE COALESCE((item ->> 'isUnexpected')::boolean, false) = false
                      AND item ? 'productId'
                    GROUP BY header.id, (item ->> 'productId')::integer
                )
                UPDATE po_invoices invoice
                SET
                    verified_quantity = LEAST(verified.verified_quantity, invoice.billed_qty),
                    remaining_allocation = GREATEST(
                        LEAST(verified.verified_quantity, invoice.billed_qty)
                        - GREATEST(invoice.billed_qty - invoice.remaining_allocation, 0),
                        0
                    ),
                    location_allotted = GREATEST(
                        LEAST(verified.verified_quantity, invoice.billed_qty)
                        - GREATEST(invoice.billed_qty - invoice.remaining_allocation, 0),
                        0
                    ) = 0
                FROM verified_rows verified
                WHERE invoice.po_invoice_header_id = verified.header_id
                  AND invoice.product_id = verified.product_id
                  AND invoice.verified_quantity IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "verified_quantity",
                table: "po_invoices");
        }
    }
}
