using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPoInvoiceTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "po_invoices",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    invoice_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    party_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    billed_qty = table.Column<int>(type: "integer", nullable: false),
                    printed = table.Column<bool>(type: "boolean", nullable: false),
                    remaining_allocation = table.Column<int>(type: "integer", nullable: false),
                    location_allotted = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_po_invoices", x => x.id);
                    table.ForeignKey(
                        name: "FK_po_invoices_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_allotted_locations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    location_json = table.Column<Dictionary<string, int>>(type: "jsonb", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_allotted_locations", x => x.id);
                    table.ForeignKey(
                        name: "FK_product_allotted_locations_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_quantities",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    current_quantity = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_quantities", x => x.id);
                    table.ForeignKey(
                        name: "FK_product_quantities_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_invoice_date_product_id",
                table: "po_invoices",
                columns: new[] { "invoice_date", "product_id" });

            migrationBuilder.CreateIndex(
                name: "IX_po_invoices_product_id",
                table: "po_invoices",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_product_allotted_locations_product_id",
                table: "product_allotted_locations",
                column: "product_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_quantities_product_id",
                table: "product_quantities",
                column: "product_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "po_invoices");

            migrationBuilder.DropTable(
                name: "product_allotted_locations");

            migrationBuilder.DropTable(
                name: "product_quantities");
        }
    }
}
