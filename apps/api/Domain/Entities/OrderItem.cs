namespace MawridTravel.Api.Domain.Entities;

public sealed class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public required string ProductName { get; set; }
    public required string ProductSlug { get; set; }
    public Guid ColorOptionValueId { get; set; }
    public required string Color { get; set; }
    public string? ColorHex { get; set; }
    public Guid SizeOptionValueId { get; set; }
    public required string Size { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal LineTotal { get; set; }
    public Order Order { get; set; } = null!;
}
