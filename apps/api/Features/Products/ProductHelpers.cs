using System.Globalization;
using System.Text;
using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Persistence;
using MawridTravel.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Products;

internal static class ProductHelpers
{
    public static ProductResponse ToResponse(
        this Product product,
        IImageStorage imageStorage) =>
        new(
            product.Id,
            product.Name,
            product.Slug,
            product.Description,
            product.Sku,
            product.Price,
            product.CompareAtPrice,
            product.Currency,
            product.StockQuantity,
            product.IsActive,
            product.CreatedAt,
            product.UpdatedAt,
            product.Images
                .OrderByDescending(image => image.IsPrimary)
                .ThenBy(image => image.SortOrder)
                .Select(image => new ProductImageResponse(
                    image.Id,
                    imageStorage.GetPublicUrl(image.ObjectKey),
                    image.ContentType,
                    image.AltText,
                    image.SortOrder,
                    image.IsPrimary))
                .ToArray(),
            product.Options
                .OrderBy(option => option.SortOrder)
                .Select(option => new ProductOptionResponse(
                    option.Id,
                    option.Name,
                    option.SortOrder,
                    option.Values
                        .OrderBy(value => value.SortOrder)
                        .Select(value => new ProductOptionValueResponse(
                            value.Id,
                            value.Value,
                            value.ColorHex,
                            value.SortOrder))
                        .ToArray()))
                .ToArray());

    public static async Task<string> CreateUniqueSlugAsync(
        AppDbContext dbContext,
        string value,
        Guid? excludedProductId,
        CancellationToken cancellationToken)
    {
        var baseSlug = Slugify(value);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = $"product-{Guid.NewGuid():N}";
        }

        baseSlug = baseSlug[..Math.Min(baseSlug.Length, 210)].Trim('-');
        var slug = baseSlug;
        var suffix = 2;

        while (await dbContext.Products.AnyAsync(
                   product => product.Slug == slug &&
                              (!excludedProductId.HasValue ||
                               product.Id != excludedProductId.Value),
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
            if (CharUnicodeInfo.GetUnicodeCategory(character) ==
                UnicodeCategory.NonSpacingMark)
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
