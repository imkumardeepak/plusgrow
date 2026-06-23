using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExportSettingsToParty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "export_enabled",
                table: "parties",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "export_file_name",
                table: "parties",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "export_folder_path",
                table: "parties",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "export_enabled",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "export_file_name",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "export_folder_path",
                table: "parties");
        }
    }
}
