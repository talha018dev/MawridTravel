namespace MawridTravel.Api.Features.Products;

internal sealed record ProductWriteRequest(
    string? Name,
    string? Slug,
    string? Description,
    string? Sku,
    decimal Price,
    decimal? CompareAtPrice,
    string? Currency,
    int StockQuantity,
    bool IsActive);

internal sealed record ProductResponse(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string? Sku,
    decimal Price,
    decimal? CompareAtPrice,
    string Currency,
    int StockQuantity,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<ProductImageResponse> Images);

internal sealed record ProductImageResponse(
    Guid Id,
    string Url,
    string ContentType,
    string? AltText,
    int SortOrder,
    bool IsPrimary);

internal sealed record ProductListResponse(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyList<ProductResponse> Items);

internal sealed record UpdateProductImageRequest(
    string? AltText,
    int SortOrder,
    bool IsPrimary);
