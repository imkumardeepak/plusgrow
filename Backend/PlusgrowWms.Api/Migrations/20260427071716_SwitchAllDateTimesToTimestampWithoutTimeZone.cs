using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class SwitchAllDateTimesToTimestampWithoutTimeZone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            AlterToTimestampWithoutTimeZone(migrationBuilder, "users", "last_login_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "users", "created_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "roles", "created_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "role_page_access", "created_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "products", "created_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "product_quantities", "updated_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "product_allotted_locations", "updated_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "po_invoices", "invoice_date");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "po_invoices", "created_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "manufacturers", "created_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "locations", "created_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "importers", "created_at");
            AlterToTimestampWithoutTimeZone(migrationBuilder, "bins", "created_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            AlterToTimestampWithTimeZone(migrationBuilder, "users", "last_login_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "users", "created_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "roles", "created_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "role_page_access", "created_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "products", "created_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "product_quantities", "updated_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "product_allotted_locations", "updated_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "po_invoices", "invoice_date");
            AlterToTimestampWithTimeZone(migrationBuilder, "po_invoices", "created_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "manufacturers", "created_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "locations", "created_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "importers", "created_at");
            AlterToTimestampWithTimeZone(migrationBuilder, "bins", "created_at");
        }

        private static void AlterToTimestampWithoutTimeZone(MigrationBuilder migrationBuilder, string table, string column)
        {
            migrationBuilder.Sql($@"ALTER TABLE ""{table}"" ALTER COLUMN ""{column}"" TYPE timestamp without time zone USING ""{column}"" AT TIME ZONE 'UTC';");
        }

        private static void AlterToTimestampWithTimeZone(MigrationBuilder migrationBuilder, string table, string column)
        {
            migrationBuilder.Sql($@"ALTER TABLE ""{table}"" ALTER COLUMN ""{column}"" TYPE timestamp with time zone USING ""{column}"" AT TIME ZONE 'UTC';");
        }
    }
}
