using MawridTravel.Api.Features.Blogs;
using MawridTravel.Api.Infrastructure.Persistence;
using MawridTravel.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Admin.Blogs.Images;

internal static class BlogFeaturedImageEndpoints
{
    private const int MaxUploadBytes = 5 * 1024 * 1024;

    private static readonly IReadOnlyDictionary<string, string> ExtensionsByContentType =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = "jpg",
            ["image/png"] = "png",
            ["image/webp"] = "webp"
        };

    public static RouteGroupBuilder MapBlogFeaturedImageEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/{id:guid}/featured-image", UploadAsync)
            .WithName("UploadBlogFeaturedImage");
        group.MapDelete("/{id:guid}/featured-image", DeleteAsync)
            .WithName("DeleteBlogFeaturedImage");

        return group;
    }

    private static async Task<IResult> UploadAsync(
        Guid id,
        HttpRequest request,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        if (!imageStorage.IsConfigured)
        {
            return BlogHandlers.StorageUnavailable();
        }

        var blog = await dbContext.BlogPosts
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (blog is null)
        {
            return Results.NotFound();
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

        await using var content = new MemoryStream();
        var withinLimit = await CopyWithLimitAsync(
            request.Body,
            content,
            MaxUploadBytes,
            cancellationToken);
        if (!withinLimit || content.Length == 0)
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
        var objectKey = $"blogs/{blog.Id:N}/{Guid.NewGuid():N}.{extension}";
        await imageStorage.UploadAsync(objectKey, content, contentType, cancellationToken);

        var previousObjectKey = blog.FeaturedImageObjectKey;
        blog.FeaturedImageObjectKey = objectKey;
        blog.FeaturedImageContentType = contentType;
        blog.UpdatedAt = timeProvider.GetUtcNow();

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await imageStorage.DeleteAsync(objectKey, CancellationToken.None);
            throw;
        }

        if (previousObjectKey is not null)
        {
            await imageStorage.DeleteAsync(previousObjectKey, cancellationToken);
        }

        return Results.Ok(blog.ToResponse(imageStorage));
    }

    private static async Task<IResult> DeleteAsync(
        Guid id,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        if (!imageStorage.IsConfigured)
        {
            return BlogHandlers.StorageUnavailable();
        }

        var blog = await dbContext.BlogPosts
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (blog is null)
        {
            return Results.NotFound();
        }

        if (blog.FeaturedImageObjectKey is null)
        {
            return Results.NoContent();
        }

        await imageStorage.DeleteAsync(blog.FeaturedImageObjectKey, cancellationToken);
        blog.FeaturedImageObjectKey = null;
        blog.FeaturedImageContentType = null;
        blog.UpdatedAt = timeProvider.GetUtcNow();
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
