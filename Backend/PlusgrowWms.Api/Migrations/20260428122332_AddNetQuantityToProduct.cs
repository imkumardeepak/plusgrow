using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNetQuantityToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "mrp_quantity",
                table: "products",
                newName: "factor");

            migrationBuilder.AddColumn<string>(
                name: "net_quantity",
                table: "products",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "net_quantity",
                table: "products");

            migrationBuilder.RenameColumn(
                name: "factor",
                table: "products",
                newName: "mrp_quantity");
        }
    }
}
