using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIsReadyForProcessingFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_ready_for_processing",
                table: "sales_orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_ready_for_processing",
                table: "sales_orders");
        }
    }
}
