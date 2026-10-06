namespace MawridTravel.Api.Domain.Entities;

public sealed class ProductImage
{
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public required string ObjectKey { get; set; }

    public required string ContentType { get; set; }

    public string? AltText { get; set; }

    public int SortOrder { get; set; }

    public bool IsPrimary { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Product Product { get; set; } = null!;
}
