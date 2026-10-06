using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MawridTravel.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AllowCompareAtPriceBelowPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_CompareAtPrice",
                table: "Products");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_CompareAtPrice",
                table: "Products",
                sql: "\"CompareAtPrice\" IS NULL OR \"CompareAtPrice\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Products_CompareAtPrice",
                table: "Products");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Products_CompareAtPrice",
                table: "Products",
                sql: "\"CompareAtPrice\" IS NULL OR \"CompareAtPrice\" >= \"Price\"");
        }
    }
}
