using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MawridTravel.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBlogSeoMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CanonicalUrl",
                table: "BlogPosts",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaDescription",
                table: "BlogPosts",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetaTitle",
                table: "BlogPosts",
                type: "character varying(70)",
                maxLength: 70,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SocialDescription",
                table: "BlogPosts",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SocialTitle",
                table: "BlogPosts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanonicalUrl",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "MetaDescription",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "MetaTitle",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "SocialDescription",
                table: "BlogPosts");

            migrationBuilder.DropColumn(
                name: "SocialTitle",
                table: "BlogPosts");
        }
    }
}
