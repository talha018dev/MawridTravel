namespace MawridTravel.Api.Domain.Entities;

public sealed class Product
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public required string Slug { get; set; }

    public string? Description { get; set; }

    public string? Sku { get; set; }

    public decimal Price { get; set; }

    public decimal? CompareAtPrice { get; set; }

    public required string Currency { get; set; }

    public int StockQuantity { get; set; }

    public bool IsActive { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<ProductImage> Images { get; set; } = [];

    public ICollection<ProductOption> Options { get; set; } = [];
}
