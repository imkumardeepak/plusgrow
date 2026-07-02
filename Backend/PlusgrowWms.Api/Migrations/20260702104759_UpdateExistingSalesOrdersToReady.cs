using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateExistingSalesOrdersToReady : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE sales_orders SET is_ready_for_processing = TRUE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
