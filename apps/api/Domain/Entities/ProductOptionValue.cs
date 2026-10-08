namespace MawridTravel.Api.Domain.Entities;

public sealed class ProductOptionValue
{
    public Guid Id { get; set; }

    public Guid ProductOptionId { get; set; }

    public required string Value { get; set; }

    public string? ColorHex { get; set; }

    public int SortOrder { get; set; }

    public ProductOption ProductOption { get; set; } = null!;
}
