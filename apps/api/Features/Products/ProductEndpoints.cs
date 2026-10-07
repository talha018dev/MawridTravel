using MawridTravel.Api.Infrastructure.Persistence;
using MawridTravel.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Products;

internal static class ProductEndpoints
{
    public static IEndpointRouteBuilder MapProductEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/products").WithTags("Products");

        group.MapGet("/", GetProductsAsync).WithName("GetProducts");
        group.MapGet("/{slug}", GetProductAsync).WithName("GetProductBySlug");

        return endpoints;
    }

    private static async Task<IResult> GetProductsAsync(
        AppDbContext dbContext,
        IImageStorage imageStorage,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Products
            .AsNoTracking()
            .Where(product => product.IsActive);
        var totalCount = await query.CountAsync(cancellationToken);
        var products = await query
            .Include(product => product.Images)
            .OrderByDescending(product => product.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Results.Ok(new ProductListResponse(
            page,
            pageSize,
            totalCount,
            products.Select(product => product.ToResponse(imageStorage)).ToArray()));
    }

    private static async Task<IResult> GetProductAsync(
        string slug,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        var product = await dbContext.Products
            .AsNoTracking()
            .Include(item => item.Images)
            .SingleOrDefaultAsync(
                item => item.IsActive && item.Slug == normalizedSlug,
                cancellationToken);

        return product is null
            ? Results.NotFound()
            : Results.Ok(product.ToResponse(imageStorage));
    }
}
