using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeleteEnabled : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_commodities_commodity_id",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_products_manufacturers_manufacturer_id",
                table: "products");

            migrationBuilder.AddForeignKey(
                name: "FK_products_commodities_commodity_id",
                table: "products",
                column: "commodity_id",
                principalTable: "commodities",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_products_manufacturers_manufacturer_id",
                table: "products",
                column: "manufacturer_id",
                principalTable: "manufacturers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_commodities_commodity_id",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_products_manufacturers_manufacturer_id",
                table: "products");

            migrationBuilder.AddForeignKey(
                name: "FK_products_commodities_commodity_id",
                table: "products",
                column: "commodity_id",
                principalTable: "commodities",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_products_manufacturers_manufacturer_id",
                table: "products",
                column: "manufacturer_id",
                principalTable: "manufacturers",
                principalColumn: "id");
        }
    }
}
