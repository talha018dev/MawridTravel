using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Features.Products;
using MawridTravel.Api.Infrastructure.Persistence;
using MawridTravel.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Admin.Products.Images;

internal static class ProductImageEndpoints
{
    private const int MaxImagesPerProduct = 10;
    private const int MaxUploadBytes = 5 * 1024 * 1024;

    private static readonly IReadOnlyDictionary<string, string> ExtensionsByContentType =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = "jpg",
            ["image/png"] = "png",
            ["image/webp"] = "webp"
        };

    public static RouteGroupBuilder MapProductImageEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/{id:guid}/images", UploadImageAsync)
            .WithName("UploadProductImage");
        group.MapPut("/{productId:guid}/images/{imageId:guid}", UpdateImageAsync)
            .WithName("UpdateProductImage");
        group.MapDelete("/{productId:guid}/images/{imageId:guid}", DeleteImageAsync)
            .WithName("DeleteProductImage");

        return group;
    }

    private static async Task<IResult> UploadImageAsync(
        Guid id,
        HttpRequest request,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        TimeProvider timeProvider,
        string? altText = null,
        bool isPrimary = false,
        CancellationToken cancellationToken = default)
    {
        if (!imageStorage.IsConfigured)
        {
            return ProductHandlers.StorageUnavailable();
        }

        var product = await dbContext.Products
            .Include(item => item.Images)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (product is null)
        {
            return Results.NotFound();
        }

        if (product.Images.Count >= MaxImagesPerProduct)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["image"] = [$"A product can have at most {MaxImagesPerProduct} images."]
            });
        }

        var contentType = request.ContentType?.Split(';', 2)[0].Trim();
        if (contentType is null ||
            !ExtensionsByContentType.TryGetValue(contentType, out var extension))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["image"] = ["Upload a JPEG, PNG, or WebP image."]
            });
        }

        if (request.ContentLength is <= 0 or > MaxUploadBytes)
        {
            return ImageSizeProblem();
        }

        var imageErrors = ProductValidator.ValidateImage(
            altText,
            product.Images.Count == 0 ? 0 : product.Images.Max(image => image.SortOrder) + 1);
        if (imageErrors.Count > 0)
        {
            return Results.ValidationProblem(imageErrors);
        }

        await using var content = new MemoryStream();
        var copyResult = await CopyWithLimitAsync(
            request.Body,
            content,
            MaxUploadBytes,
            cancellationToken);
        if (!copyResult || content.Length == 0)
        {
            return ImageSizeProblem();
        }

        if (!HasExpectedSignature(content.GetBuffer(), (int)content.Length, contentType))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["image"] = ["The file contents do not match the declared image type."]
            });
        }

        content.Position = 0;
        var objectKey = $"products/{product.Id:N}/{Guid.NewGuid():N}.{extension}";
        await imageStorage.UploadAsync(
            objectKey,
            content,
            contentType,
            cancellationToken);

        var makePrimary = product.Images.Count == 0 || isPrimary;
        if (makePrimary)
        {
            foreach (var existingImage in product.Images)
            {
                existingImage.IsPrimary = false;
            }
        }

        var image = new ProductImage
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            ObjectKey = objectKey,
            ContentType = contentType,
            AltText = string.IsNullOrWhiteSpace(altText) ? null : altText.Trim(),
            SortOrder = product.Images.Count == 0
                ? 0
                : product.Images.Max(existingImage => existingImage.SortOrder) + 1,
            IsPrimary = makePrimary,
            CreatedAt = timeProvider.GetUtcNow()
        };

        dbContext.ProductImages.Add(image);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await imageStorage.DeleteAsync(objectKey, CancellationToken.None);
            throw;
        }

        return Results.Created(
            $"/api/admin/products/{product.Id}/images/{image.Id}",
            new ProductImageResponse(
                image.Id,
                imageStorage.GetPublicUrl(image.ObjectKey),
                image.ContentType,
                image.AltText,
                image.SortOrder,
                image.IsPrimary));
    }

    private static async Task<IResult> UpdateImageAsync(
        Guid productId,
        Guid imageId,
        UpdateProductImageRequest request,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        CancellationToken cancellationToken)
    {
        var errors = ProductValidator.ValidateImage(request.AltText, request.SortOrder);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var product = await dbContext.Products
            .Include(item => item.Images)
            .SingleOrDefaultAsync(item => item.Id == productId, cancellationToken);
        var image = product?.Images.SingleOrDefault(item => item.Id == imageId);
        if (product is null || image is null)
        {
            return Results.NotFound();
        }

        if (request.IsPrimary)
        {
            foreach (var existingImage in product.Images)
            {
                existingImage.IsPrimary = existingImage.Id == imageId;
            }
        }
        else if (image.IsPrimary && product.Images.Count > 1)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["isPrimary"] = ["Choose another primary image before removing this one."]
            });
        }

        image.AltText = string.IsNullOrWhiteSpace(request.AltText)
            ? null
            : request.AltText.Trim();
        image.SortOrder = request.SortOrder;
        image.IsPrimary = request.IsPrimary || product.Images.Count == 1;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.Ok(new ProductImageResponse(
            image.Id,
            imageStorage.GetPublicUrl(image.ObjectKey),
            image.ContentType,
            image.AltText,
            image.SortOrder,
            image.IsPrimary));
    }

    private static async Task<IResult> DeleteImageAsync(
        Guid productId,
        Guid imageId,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        CancellationToken cancellationToken)
    {
        if (!imageStorage.IsConfigured)
        {
            return ProductHandlers.StorageUnavailable();
        }

        var product = await dbContext.Products
            .Include(item => item.Images)
            .SingleOrDefaultAsync(item => item.Id == productId, cancellationToken);
        var image = product?.Images.SingleOrDefault(item => item.Id == imageId);
        if (product is null || image is null)
        {
            return Results.NotFound();
        }

        await imageStorage.DeleteAsync(image.ObjectKey, cancellationToken);
        product.Images.Remove(image);
        dbContext.ProductImages.Remove(image);

        if (image.IsPrimary && product.Images.Count > 0)
        {
            product.Images
                .OrderBy(item => item.SortOrder)
                .First()
                .IsPrimary = true;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<bool> CopyWithLimitAsync(
        Stream source,
        Stream destination,
        int limit,
        CancellationToken cancellationToken)
    {
        var buffer = new byte[81_920];
        var total = 0;

        while (true)
        {
            var read = await source.ReadAsync(buffer, cancellationToken);
            if (read == 0)
            {
                return true;
            }

            total += read;
            if (total > limit)
            {
                return false;
            }

            await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }
    }

    private static bool HasExpectedSignature(
        byte[] bytes,
        int length,
        string contentType) => contentType switch
        {
            "image/jpeg" => length >= 3 &&
                            bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
            "image/png" => length >= 8 &&
                           bytes.AsSpan(0, 8).SequenceEqual(
                               new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "image/webp" => length >= 12 &&
                            bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
                            bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };

    private static IResult ImageSizeProblem() => Results.ValidationProblem(
        new Dictionary<string, string[]>
        {
            ["image"] = ["Image size must be between 1 byte and 5 MB."]
        });
}
