using MawridTravel.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MawridTravel.Api.Infrastructure.Persistence.Configurations;

internal sealed class BlogPostConfiguration : IEntityTypeConfiguration<BlogPost>
{
    public void Configure(EntityTypeBuilder<BlogPost> builder)
    {
        builder.Property(blog => blog.Title).HasMaxLength(200);
        builder.Property(blog => blog.Slug).HasMaxLength(220);
        builder.Property(blog => blog.Excerpt).HasMaxLength(500);
        builder.Property(blog => blog.Content).HasMaxLength(100_000);
        builder.Property(blog => blog.MetaTitle).HasMaxLength(70);
        builder.Property(blog => blog.MetaDescription).HasMaxLength(160);
        builder.Property(blog => blog.CanonicalUrl).HasMaxLength(2_048);
        builder.Property(blog => blog.SocialTitle).HasMaxLength(100);
        builder.Property(blog => blog.SocialDescription).HasMaxLength(300);
        builder.Property(blog => blog.FeaturedImageObjectKey).HasMaxLength(500);
        builder.Property(blog => blog.FeaturedImageContentType).HasMaxLength(100);

        builder.HasIndex(blog => blog.Slug).IsUnique();
        builder.HasIndex(blog => new { blog.IsPublished, blog.PublishedAt });
        builder.HasIndex(blog => blog.CreatedAt);
    }
}
