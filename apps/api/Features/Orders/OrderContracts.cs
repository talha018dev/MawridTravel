namespace MawridTravel.Api.Features.Orders;

internal sealed record CheckoutRequest(
    string? FullName,
    string? Phone,
    string? Email,
    string? Address,
    string? DeliveryArea,
    string? PaymentMethod,
    IReadOnlyList<CheckoutItemRequest>? Items);

internal sealed record CheckoutItemRequest(
    Guid ProductId,
    Guid ColorOptionValueId,
    Guid SizeOptionValueId,
    int Quantity);

internal sealed record OrderResponse(
    Guid Id,
    string OrderNumber,
    string FullName,
    string Phone,
    string? Email,
    string Address,
    string DeliveryArea,
    string PaymentMethod,
    string Status,
    string Currency,
    decimal Subtotal,
    decimal DeliveryFee,
    decimal Total,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<OrderItemResponse> Items);

internal sealed record OrderItemResponse(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSlug,
    Guid ColorOptionValueId,
    string Color,
    string? ColorHex,
    Guid SizeOptionValueId,
    string Size,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);

internal sealed record OrderListResponse(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyList<OrderResponse> Items);

internal sealed record UpdateOrderStatusRequest(string? Status);
