using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTrackingPickedPacked : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "tracking_number",
                table: "sales_orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "packed_at",
                table: "sales_order_items",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "picked_at",
                table: "sales_order_items",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "tracking_number",
                table: "sales_orders");

            migrationBuilder.DropColumn(
                name: "packed_at",
                table: "sales_order_items");

            migrationBuilder.DropColumn(
                name: "picked_at",
                table: "sales_order_items");
        }
    }
}
