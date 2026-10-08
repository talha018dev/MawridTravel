using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Features.Products;
using MawridTravel.Api.Infrastructure.Persistence;
using MawridTravel.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Admin.Products;

internal static class ProductHandlers
{
    public static async Task<IResult> GetProductsAsync(
        AppDbContext dbContext,
        IImageStorage imageStorage,
        string? search,
        bool? isActive,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Products.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(product =>
                product.Name.ToLower().Contains(term) ||
                product.Slug.ToLower().Contains(term) ||
                product.Sku != null && product.Sku.ToLower().Contains(term));
        }

        if (isActive.HasValue)
        {
            query = query.Where(product => product.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var products = await query
            .Include(product => product.Images)
            .Include(product => product.Options)
            .ThenInclude(option => option.Values)
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

    public static async Task<IResult> GetProductAsync(
        Guid id,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        CancellationToken cancellationToken)
    {
        var product = await dbContext.Products
            .AsNoTracking()
            .Include(item => item.Images)
            .Include(item => item.Options)
            .ThenInclude(option => option.Values)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return product is null
            ? Results.NotFound()
            : Results.Ok(product.ToResponse(imageStorage));
    }

    public static async Task<IResult> CreateProductAsync(
        ProductWriteRequest request,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var errors = ProductValidator.Validate(request);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var sku = NormalizeSku(request.Sku);
        if (sku is not null && await dbContext.Products.AnyAsync(
                product => product.Sku == sku,
                cancellationToken))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["sku"] = ["A product with this SKU already exists."]
            });
        }

        var slugSource = string.IsNullOrWhiteSpace(request.Slug)
            ? request.Name!
            : request.Slug;
        var now = timeProvider.GetUtcNow();
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = request.Name!.Trim(),
            Slug = await ProductHelpers.CreateUniqueSlugAsync(
                dbContext,
                slugSource!,
                null,
                cancellationToken),
            Description = NormalizeOptional(request.Description),
            Sku = sku,
            Price = request.Price,
            CompareAtPrice = request.CompareAtPrice,
            Currency = request.Currency!.Trim().ToUpperInvariant(),
            StockQuantity = request.StockQuantity,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now,
            Options = CreateOptions(request.Options)
        };

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/api/admin/products/{product.Id}",
            product.ToResponse(imageStorage));
    }

    public static async Task<IResult> UpdateProductAsync(
        Guid id,
        ProductWriteRequest request,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var errors = ProductValidator.Validate(request);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var product = await dbContext.Products
            .Include(item => item.Images)
            .Include(item => item.Options)
            .ThenInclude(option => option.Values)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (product is null)
        {
            return Results.NotFound();
        }

        var sku = NormalizeSku(request.Sku);
        if (sku is not null && await dbContext.Products.AnyAsync(
                item => item.Id != id && item.Sku == sku,
                cancellationToken))
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["sku"] = ["A product with this SKU already exists."]
            });
        }

        var slugSource = string.IsNullOrWhiteSpace(request.Slug)
            ? request.Name!
            : request.Slug;
        product.Name = request.Name!.Trim();
        product.Slug = await ProductHelpers.CreateUniqueSlugAsync(
            dbContext,
            slugSource!,
            id,
            cancellationToken);
        product.Description = NormalizeOptional(request.Description);
        product.Sku = sku;
        product.Price = request.Price;
        product.CompareAtPrice = request.CompareAtPrice;
        product.Currency = request.Currency!.Trim().ToUpperInvariant();
        product.StockQuantity = request.StockQuantity;
        product.IsActive = request.IsActive;
        product.UpdatedAt = timeProvider.GetUtcNow();

        dbContext.ProductOptions.RemoveRange(product.Options);
        product.Options = CreateOptions(request.Options);

        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.Ok(product.ToResponse(imageStorage));
    }

    public static async Task<IResult> DeleteProductAsync(
        Guid id,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        CancellationToken cancellationToken)
    {
        var product = await dbContext.Products
            .Include(item => item.Images)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (product is null)
        {
            return Results.NotFound();
        }

        if (product.Images.Count > 0 && !imageStorage.IsConfigured)
        {
            return StorageUnavailable();
        }

        foreach (var image in product.Images)
        {
            await imageStorage.DeleteAsync(image.ObjectKey, cancellationToken);
        }

        dbContext.Products.Remove(product);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    internal static IResult StorageUnavailable() => Results.Problem(
        statusCode: StatusCodes.Status503ServiceUnavailable,
        title: "Product image storage is not configured.");

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? NormalizeSku(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();

    private static List<ProductOption> CreateOptions(
        IReadOnlyList<ProductOptionWriteRequest>? requests) =>
        requests?
            .Where(option => !string.IsNullOrWhiteSpace(option.Name))
            .Select(option => new ProductOption
            {
                Id = Guid.NewGuid(),
                Name = option.Name!.Trim(),
                SortOrder = option.SortOrder,
                Values = option.Values?
                    .Where(value => !string.IsNullOrWhiteSpace(value.Value))
                    .Select(value => new ProductOptionValue
                    {
                        Id = Guid.NewGuid(),
                        Value = value.Value!.Trim(),
                        ColorHex = NormalizeOptional(value.ColorHex)?.ToUpperInvariant(),
                        SortOrder = value.SortOrder
                    })
                    .ToList() ?? []
            })
            .Where(option => option.Values.Count > 0)
            .ToList() ?? [];
}
