using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveImporterCin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_importers_cin",
                table: "importers");

            migrationBuilder.DropColumn(
                name: "cin",
                table: "importers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "cin",
                table: "importers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_importers_cin",
                table: "importers",
                column: "cin");
        }
    }
}
