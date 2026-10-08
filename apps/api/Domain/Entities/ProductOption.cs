namespace MawridTravel.Api.Domain.Entities;

public sealed class ProductOption
{
    public Guid Id { get; set; }

    public Guid ProductId { get; set; }

    public required string Name { get; set; }

    public int SortOrder { get; set; }

    public Product Product { get; set; } = null!;

    public ICollection<ProductOptionValue> Values { get; set; } = [];
}
