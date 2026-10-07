using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MawridTravel.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class StoreBlogFeaturedImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeaturedImageUrl",
                table: "BlogPosts");

            migrationBuilder.AddColumn<string>(
                name: "FeaturedImageContentType",
                table: "BlogPosts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FeaturedImageObjectKey",
                table: "BlogPosts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeaturedImageContentType",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "FeaturedImageObjectKey",
                table: "BlogPosts");

            migrationBuilder.AddColumn<string>(
                name: "FeaturedImageUrl",
                table: "BlogPosts",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);
        }
    }
}
