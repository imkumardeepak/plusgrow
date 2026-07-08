using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PlusgrowWms.Api.Data;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(PlusgrowDbContext))]
    [Migration("20260708103000_ResellerOrderNoText")]
    public partial class ResellerOrderNoText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "OrderNo",
                table: "resellersyncedorders",
                type: "text",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE resellersyncedorders
                ALTER COLUMN "OrderNo" TYPE bigint
                USING "OrderNo"::bigint;
                """);
        }
    }
}
