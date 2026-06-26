using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTallySyncSkippedOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tally_sync_skipped_orders",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tally_reference = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    party_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    order_date = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    skip_reason = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    details = table.Column<string>(type: "text", nullable: true),
                    unmatched_products = table.Column<string>(type: "jsonb", nullable: true),
                    raw_items_json = table.Column<string>(type: "jsonb", nullable: true),
                    is_resolved = table.Column<bool>(type: "boolean", nullable: false),
                    synced_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    resolved_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tally_sync_skipped_orders", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tally_sync_skipped_orders");
        }
    }
}
