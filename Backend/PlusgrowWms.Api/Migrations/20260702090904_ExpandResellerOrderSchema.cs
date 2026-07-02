using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExpandResellerOrderSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "SyncedAt",
                table: "resellersyncedorders",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AddColumn<string>(
                name: "BillingAddress_City",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "BillingAddress_ContactNo",
                table: "resellersyncedorders",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BillingAddress_Line1",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BillingAddress_Line2",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BillingAddress_Name",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "BillingAddress_Pincode",
                table: "resellersyncedorders",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BillingAddress_State",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CommonCostCentre",
                table: "resellersyncedorders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "CompositeShippingCharges",
                table: "resellersyncedorders",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "FetchedAt",
                table: "resellersyncedorders",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress_City",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ShippingAddress_ContactNo",
                table: "resellersyncedorders",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress_Line1",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress_Line2",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress_Name",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ShippingAddress_Pincode",
                table: "resellersyncedorders",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress_State",
                table: "resellersyncedorders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VoucherType",
                table: "resellersyncedorders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "resellersyncedorderitems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResellerSyncedOrderId = table.Column<int>(type: "integer", nullable: false),
                    Sku = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    Rate = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_resellersyncedorderitems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_resellersyncedorderitems_resellersyncedorders_ResellerSynce~",
                        column: x => x.ResellerSyncedOrderId,
                        principalTable: "resellersyncedorders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_resellersyncedorderitems_ResellerSyncedOrderId",
                table: "resellersyncedorderitems",
                column: "ResellerSyncedOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "resellersyncedorderitems");

            migrationBuilder.DropColumn(
                name: "BillingAddress_City",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "BillingAddress_ContactNo",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "BillingAddress_Line1",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "BillingAddress_Line2",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "BillingAddress_Name",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "BillingAddress_Pincode",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "BillingAddress_State",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "CommonCostCentre",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "CompositeShippingCharges",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "FetchedAt",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress_City",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress_ContactNo",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress_Line1",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress_Line2",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress_Name",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress_Pincode",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "ShippingAddress_State",
                table: "resellersyncedorders");

            migrationBuilder.DropColumn(
                name: "VoucherType",
                table: "resellersyncedorders");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SyncedAt",
                table: "resellersyncedorders",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);
        }
    }
}
