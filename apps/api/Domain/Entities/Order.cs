namespace MawridTravel.Api.Domain.Entities;

public sealed class Order
{
    public Guid Id { get; set; }
    public required string IdempotencyKey { get; set; }
    public required string RequestFingerprint { get; set; }
    public required string OrderNumber { get; set; }
    public required string FullName { get; set; }
    public required string Phone { get; set; }
    public string? Email { get; set; }
    public required string Address { get; set; }
    public required string DeliveryArea { get; set; }
    public required string PaymentMethod { get; set; }
    public required string Status { get; set; }
    public required string Currency { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal Total { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<OrderItem> Items { get; set; } = [];
}
