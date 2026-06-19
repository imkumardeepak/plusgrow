using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class CleanupTallyVoucherAndPickedLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS tallyvoucheritems;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS tallyvouchers;");

            migrationBuilder.AddColumn<Dictionary<string, int>>(
                name: "picked_location_json",
                table: "sales_order_items",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "picked_location_json",
                table: "sales_order_items");
        }
    }
}
