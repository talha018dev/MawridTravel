using MawridTravel.Api.Domain.Entities;

namespace MawridTravel.Api.Features.Orders;

internal static class OrderHelpers
{
    public static OrderResponse ToResponse(this Order order) => new(
        order.Id,
        order.OrderNumber,
        order.FullName,
        order.Phone,
        order.Email,
        order.Address,
        order.DeliveryArea,
        order.PaymentMethod,
        order.Status,
        order.Currency,
        order.Subtotal,
        order.DeliveryFee,
        order.Total,
        order.CreatedAt,
        order.UpdatedAt,
        order.Items.Select(item => new OrderItemResponse(
            item.Id,
            item.ProductId,
            item.ProductName,
            item.ProductSlug,
            item.ColorOptionValueId,
            item.Color,
            item.ColorHex,
            item.SizeOptionValueId,
            item.Size,
            item.UnitPrice,
            item.Quantity,
            item.LineTotal)).ToArray());
}
