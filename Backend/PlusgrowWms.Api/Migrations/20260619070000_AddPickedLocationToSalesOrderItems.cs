using Microsoft.EntityFrameworkCore.Migrations;
using System.Collections.Generic;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    public partial class AddPickedLocationToSalesOrderItems : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Dictionary<string, int>>(
                name: "picked_location_json",
                table: "sales_order_items",
                type: "jsonb",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "picked_location_json",
                table: "sales_order_items");
        }
    }
}
