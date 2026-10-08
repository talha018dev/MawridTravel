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
        string? search,
        bool? inStock,
        decimal? minPrice,
        decimal? maxPrice,
        string? sort,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Products
            .AsNoTracking()
            .Where(product => product.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(product =>
                product.Name.ToLower().Contains(term) ||
                product.Description != null && product.Description.ToLower().Contains(term));
        }

        if (inStock.HasValue)
        {
            query = inStock.Value
                ? query.Where(product => product.StockQuantity > 0)
                : query.Where(product => product.StockQuantity == 0);
        }

        if (minPrice.HasValue)
        {
            query = query.Where(product => product.Price >= Math.Max(minPrice.Value, 0));
        }

        if (maxPrice.HasValue)
        {
            query = query.Where(product => product.Price <= Math.Max(maxPrice.Value, 0));
        }

        query = sort?.Trim().ToLowerInvariant() switch
        {
            "price-asc" => query.OrderBy(product => product.Price),
            "price-desc" => query.OrderByDescending(product => product.Price),
            "name" => query.OrderBy(product => product.Name),
            _ => query.OrderByDescending(product => product.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var products = await query
            .Include(product => product.Images)
            .Include(product => product.Options)
            .ThenInclude(option => option.Values)
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
            .Include(item => item.Options)
            .ThenInclude(option => option.Values)
            .SingleOrDefaultAsync(
                item => item.IsActive && item.Slug == normalizedSlug,
                cancellationToken);

        return product is null
            ? Results.NotFound()
            : Results.Ok(product.ToResponse(imageStorage));
    }
}
