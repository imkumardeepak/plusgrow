using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PlusgrowWms.Api.Data;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(PlusgrowDbContext))]
    [Migration("20260708090000_AddResellerTallyHideFlag")]
    public partial class AddResellerTallyHideFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHiddenFromTallySync",
                table: "resellersyncedorders",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHiddenFromTallySync",
                table: "resellersyncedorders");
        }
    }
}
