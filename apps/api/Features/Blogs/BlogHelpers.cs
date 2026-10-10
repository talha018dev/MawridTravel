using System.Globalization;
using System.Text;
using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Persistence;
using MawridTravel.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Blogs;

internal static class BlogHelpers
{
    public static BlogResponse ToResponse(this BlogPost blog, IImageStorage imageStorage) =>
        new(
            blog.Id,
            blog.Title,
            blog.Slug,
            blog.Excerpt,
            blog.Content,
            blog.MetaTitle,
            blog.MetaDescription,
            blog.CanonicalUrl,
            blog.SocialTitle,
            blog.SocialDescription,
            blog.FeaturedImageObjectKey is null
                ? null
                : imageStorage.GetPublicUrl(blog.FeaturedImageObjectKey),
            blog.IsPublished,
            blog.PublishedAt,
            blog.CreatedAt,
            blog.UpdatedAt);

    public static async Task<string> CreateUniqueSlugAsync(
        AppDbContext dbContext,
        string value,
        Guid? excludedBlogId,
        CancellationToken cancellationToken)
    {
        var baseSlug = Slugify(value);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = $"blog-{Guid.NewGuid():N}";
        }

        baseSlug = baseSlug[..Math.Min(baseSlug.Length, 210)].Trim('-');
        var slug = baseSlug;
        var suffix = 2;

        while (await dbContext.BlogPosts.AnyAsync(
                   blog => blog.Slug == slug &&
                           (!excludedBlogId.HasValue || blog.Id != excludedBlogId.Value),
                   cancellationToken))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }

    private static string Slugify(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        var pendingSeparator = false;

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(character))
            {
                if (pendingSeparator && builder.Length > 0)
                {
                    builder.Append('-');
                }

                builder.Append(character);
                pendingSeparator = false;
            }
            else
            {
                pendingSeparator = true;
            }
        }

        return builder.ToString();
    }
}
