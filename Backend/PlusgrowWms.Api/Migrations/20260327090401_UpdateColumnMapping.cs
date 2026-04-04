using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PlusgrowWms.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateColumnMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_commodities_CommodityId",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_products_manufacturers_ManufacturerId",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_role_page_access_roles_RoleId",
                table: "role_page_access");

            migrationBuilder.DropForeignKey(
                name: "FK_users_roles_RoleId",
                table: "users");

            migrationBuilder.RenameColumn(
                name: "Username",
                table: "users",
                newName: "username");

            migrationBuilder.RenameColumn(
                name: "Phone",
                table: "users",
                newName: "phone");

            migrationBuilder.RenameColumn(
                name: "Email",
                table: "users",
                newName: "email");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "users",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "RoleId",
                table: "users",
                newName: "role_id");

            migrationBuilder.RenameColumn(
                name: "PasswordHash",
                table: "users",
                newName: "password_hash");

            migrationBuilder.RenameColumn(
                name: "LastLoginAt",
                table: "users",
                newName: "last_login_at");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "users",
                newName: "is_active");

            migrationBuilder.RenameColumn(
                name: "FullName",
                table: "users",
                newName: "full_name");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "users",
                newName: "created_at");

            migrationBuilder.RenameIndex(
                name: "IX_users_Username",
                table: "users",
                newName: "IX_users_username");

            migrationBuilder.RenameIndex(
                name: "IX_users_RoleId",
                table: "users",
                newName: "IX_users_role_id");

            migrationBuilder.RenameIndex(
                name: "IX_users_IsActive",
                table: "users",
                newName: "IX_users_is_active");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "roles",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "roles",
                newName: "description");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "roles",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "roles",
                newName: "is_active");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "roles",
                newName: "created_at");

            migrationBuilder.RenameIndex(
                name: "IX_roles_Name",
                table: "roles",
                newName: "IX_roles_name");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "role_page_access",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "RoleId",
                table: "role_page_access",
                newName: "role_id");

            migrationBuilder.RenameColumn(
                name: "PageKey",
                table: "role_page_access",
                newName: "page_key");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "role_page_access",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "CanView",
                table: "role_page_access",
                newName: "can_view");

            migrationBuilder.RenameColumn(
                name: "CanEdit",
                table: "role_page_access",
                newName: "can_edit");

            migrationBuilder.RenameColumn(
                name: "CanDelete",
                table: "role_page_access",
                newName: "can_delete");

            migrationBuilder.RenameColumn(
                name: "CanCreate",
                table: "role_page_access",
                newName: "can_create");

            migrationBuilder.RenameIndex(
                name: "IX_role_page_access_RoleId_PageKey",
                table: "role_page_access",
                newName: "IX_role_page_access_role_id_page_key");

            migrationBuilder.RenameColumn(
                name: "Ussp",
                table: "products",
                newName: "ussp");

            migrationBuilder.RenameColumn(
                name: "Sku",
                table: "products",
                newName: "sku");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "products",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Mrp",
                table: "products",
                newName: "mrp");

            migrationBuilder.RenameColumn(
                name: "Factor",
                table: "products",
                newName: "factor");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "products",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "UnitType",
                table: "products",
                newName: "unit_type");

            migrationBuilder.RenameColumn(
                name: "MrpQuantity",
                table: "products",
                newName: "mrp_quantity");

            migrationBuilder.RenameColumn(
                name: "ManufacturerId",
                table: "products",
                newName: "manufacturer_id");

            migrationBuilder.RenameColumn(
                name: "HsnCode",
                table: "products",
                newName: "hsn_code");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "products",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "CountryOfOrigin",
                table: "products",
                newName: "country_of_origin");

            migrationBuilder.RenameColumn(
                name: "CommodityId",
                table: "products",
                newName: "commodity_id");

            migrationBuilder.RenameColumn(
                name: "BestBeforeMonths",
                table: "products",
                newName: "best_before_months");

            migrationBuilder.RenameIndex(
                name: "IX_products_Sku",
                table: "products",
                newName: "IX_products_sku");

            migrationBuilder.RenameIndex(
                name: "IX_products_Name",
                table: "products",
                newName: "IX_products_name");

            migrationBuilder.RenameIndex(
                name: "IX_products_ManufacturerId",
                table: "products",
                newName: "IX_products_manufacturer_id");

            migrationBuilder.RenameIndex(
                name: "IX_products_HsnCode",
                table: "products",
                newName: "IX_products_hsn_code");

            migrationBuilder.RenameIndex(
                name: "IX_products_CommodityId",
                table: "products",
                newName: "IX_products_commodity_id");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "manufacturers",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Country",
                table: "manufacturers",
                newName: "country");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "manufacturers",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "manufacturers",
                newName: "created_at");

            migrationBuilder.RenameIndex(
                name: "IX_manufacturers_Country",
                table: "manufacturers",
                newName: "IX_manufacturers_country");

            migrationBuilder.RenameColumn(
                name: "Phone",
                table: "importers",
                newName: "phone");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "importers",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Email",
                table: "importers",
                newName: "email");

            migrationBuilder.RenameColumn(
                name: "Cin",
                table: "importers",
                newName: "cin");

            migrationBuilder.RenameColumn(
                name: "Address",
                table: "importers",
                newName: "address");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "importers",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "importers",
                newName: "created_at");

            migrationBuilder.RenameIndex(
                name: "IX_importers_Cin",
                table: "importers",
                newName: "IX_importers_cin");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "commodities",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "commodities",
                newName: "id");

            migrationBuilder.RenameIndex(
                name: "IX_commodities_Name",
                table: "commodities",
                newName: "IX_commodities_name");

            migrationBuilder.AlterColumn<decimal>(
                name: "ussp",
                table: "products",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,4)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "mrp",
                table: "products",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "factor",
                table: "products",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_products_commodities_commodity_id",
                table: "products",
                column: "commodity_id",
                principalTable: "commodities",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_products_manufacturers_manufacturer_id",
                table: "products",
                column: "manufacturer_id",
                principalTable: "manufacturers",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_role_page_access_roles_role_id",
                table: "role_page_access",
                column: "role_id",
                principalTable: "roles",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_users_roles_role_id",
                table: "users",
                column: "role_id",
                principalTable: "roles",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_commodities_commodity_id",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_products_manufacturers_manufacturer_id",
                table: "products");

            migrationBuilder.DropForeignKey(
                name: "FK_role_page_access_roles_role_id",
                table: "role_page_access");

            migrationBuilder.DropForeignKey(
                name: "FK_users_roles_role_id",
                table: "users");

            migrationBuilder.RenameColumn(
                name: "username",
                table: "users",
                newName: "Username");

            migrationBuilder.RenameColumn(
                name: "phone",
                table: "users",
                newName: "Phone");

            migrationBuilder.RenameColumn(
                name: "email",
                table: "users",
                newName: "Email");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "users",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "role_id",
                table: "users",
                newName: "RoleId");

            migrationBuilder.RenameColumn(
                name: "password_hash",
                table: "users",
                newName: "PasswordHash");

            migrationBuilder.RenameColumn(
                name: "last_login_at",
                table: "users",
                newName: "LastLoginAt");

            migrationBuilder.RenameColumn(
                name: "is_active",
                table: "users",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "full_name",
                table: "users",
                newName: "FullName");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "users",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_users_username",
                table: "users",
                newName: "IX_users_Username");

            migrationBuilder.RenameIndex(
                name: "IX_users_role_id",
                table: "users",
                newName: "IX_users_RoleId");

            migrationBuilder.RenameIndex(
                name: "IX_users_is_active",
                table: "users",
                newName: "IX_users_IsActive");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "roles",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "roles",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "roles",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "is_active",
                table: "roles",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "roles",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_roles_name",
                table: "roles",
                newName: "IX_roles_Name");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "role_page_access",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "role_id",
                table: "role_page_access",
                newName: "RoleId");

            migrationBuilder.RenameColumn(
                name: "page_key",
                table: "role_page_access",
                newName: "PageKey");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "role_page_access",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "can_view",
                table: "role_page_access",
                newName: "CanView");

            migrationBuilder.RenameColumn(
                name: "can_edit",
                table: "role_page_access",
                newName: "CanEdit");

            migrationBuilder.RenameColumn(
                name: "can_delete",
                table: "role_page_access",
                newName: "CanDelete");

            migrationBuilder.RenameColumn(
                name: "can_create",
                table: "role_page_access",
                newName: "CanCreate");

            migrationBuilder.RenameIndex(
                name: "IX_role_page_access_role_id_page_key",
                table: "role_page_access",
                newName: "IX_role_page_access_RoleId_PageKey");

            migrationBuilder.RenameColumn(
                name: "ussp",
                table: "products",
                newName: "Ussp");

            migrationBuilder.RenameColumn(
                name: "sku",
                table: "products",
                newName: "Sku");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "products",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "mrp",
                table: "products",
                newName: "Mrp");

            migrationBuilder.RenameColumn(
                name: "factor",
                table: "products",
                newName: "Factor");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "products",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "unit_type",
                table: "products",
                newName: "UnitType");

            migrationBuilder.RenameColumn(
                name: "mrp_quantity",
                table: "products",
                newName: "MrpQuantity");

            migrationBuilder.RenameColumn(
                name: "manufacturer_id",
                table: "products",
                newName: "ManufacturerId");

            migrationBuilder.RenameColumn(
                name: "hsn_code",
                table: "products",
                newName: "HsnCode");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "products",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "country_of_origin",
                table: "products",
                newName: "CountryOfOrigin");

            migrationBuilder.RenameColumn(
                name: "commodity_id",
                table: "products",
                newName: "CommodityId");

            migrationBuilder.RenameColumn(
                name: "best_before_months",
                table: "products",
                newName: "BestBeforeMonths");

            migrationBuilder.RenameIndex(
                name: "IX_products_sku",
                table: "products",
                newName: "IX_products_Sku");

            migrationBuilder.RenameIndex(
                name: "IX_products_name",
                table: "products",
                newName: "IX_products_Name");

            migrationBuilder.RenameIndex(
                name: "IX_products_manufacturer_id",
                table: "products",
                newName: "IX_products_ManufacturerId");

            migrationBuilder.RenameIndex(
                name: "IX_products_hsn_code",
                table: "products",
                newName: "IX_products_HsnCode");

            migrationBuilder.RenameIndex(
                name: "IX_products_commodity_id",
                table: "products",
                newName: "IX_products_CommodityId");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "manufacturers",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "country",
                table: "manufacturers",
                newName: "Country");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "manufacturers",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "manufacturers",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_manufacturers_country",
                table: "manufacturers",
                newName: "IX_manufacturers_Country");

            migrationBuilder.RenameColumn(
                name: "phone",
                table: "importers",
                newName: "Phone");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "importers",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "email",
                table: "importers",
                newName: "Email");

            migrationBuilder.RenameColumn(
                name: "cin",
                table: "importers",
                newName: "Cin");

            migrationBuilder.RenameColumn(
                name: "address",
                table: "importers",
                newName: "Address");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "importers",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "importers",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_importers_cin",
                table: "importers",
                newName: "IX_importers_Cin");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "commodities",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "commodities",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_commodities_name",
                table: "commodities",
                newName: "IX_commodities_Name");

            migrationBuilder.AlterColumn<decimal>(
                name: "Ussp",
                table: "products",
                type: "numeric(12,4)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Mrp",
                table: "products",
                type: "numeric(12,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Factor",
                table: "products",
                type: "numeric(10,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_products_commodities_CommodityId",
                table: "products",
                column: "CommodityId",
                principalTable: "commodities",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_products_manufacturers_ManufacturerId",
                table: "products",
                column: "ManufacturerId",
                principalTable: "manufacturers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_role_page_access_roles_RoleId",
                table: "role_page_access",
                column: "RoleId",
                principalTable: "roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_users_roles_RoleId",
                table: "users",
                column: "RoleId",
                principalTable: "roles",
                principalColumn: "Id");
        }
    }
}
