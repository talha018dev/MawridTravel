using MawridTravel.Api.Features.Orders;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Admin.Orders;

internal static class AdminOrderEndpoints
{
    public static RouteGroupBuilder MapAdminOrderEndpoints(this RouteGroupBuilder adminGroup)
    {
        var group = adminGroup.MapGroup("/orders");
        group.MapGet("/", GetOrdersAsync).WithName("GetAdminOrders");
        group.MapPatch("/{id:guid}/status", UpdateStatusAsync).WithName("UpdateOrderStatus");
        group.MapPatch("/{id:guid}/payment-method", UpdatePaymentMethodAsync).WithName("UpdateOrderPaymentMethod");
        return adminGroup;
    }

    private static async Task<IResult> GetOrdersAsync(
        AppDbContext dbContext,
        string? search,
        string? status,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Orders.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(order =>
                order.OrderNumber.ToLower().Contains(term) ||
                order.FullName.ToLower().Contains(term) ||
                order.Phone.ToLower().Contains(term) ||
                order.Email != null && order.Email.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(status) &&
            !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            if (!OrderConstants.Statuses.All.Contains(status))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["status"] = ["Select a valid order status."]
                });
            var normalizedStatus = NormalizeStatus(status);
            query = query.Where(order => order.Status == normalizedStatus);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var orders = await query
            .Include(order => order.Items)
            .OrderByDescending(order => order.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Results.Ok(new OrderListResponse(
            page,
            pageSize,
            totalCount,
            orders.Select(order => order.ToResponse()).ToArray()));
    }

    private static async Task<IResult> UpdateStatusAsync(
        Guid id,
        UpdateOrderStatusRequest? request,
        AppDbContext dbContext,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        if (request is null ||
            string.IsNullOrWhiteSpace(request.Status) ||
            !OrderConstants.Statuses.UpdateOptions.Contains(request.Status))
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["status"] = ["Select a valid order status."]
            });

        var order = await dbContext.Orders
            .Include(item => item.Items)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (order is null) return Results.NotFound();

        var nextStatus = NormalizeStatus(request.Status);
        if (nextStatus == order.Status) return Results.Ok(order.ToResponse());

        if (nextStatus == OrderConstants.Statuses.Failed &&
            order.Status != OrderConstants.Statuses.Failed)
        {
            foreach (var productGroup in order.Items.GroupBy(item => item.ProductId))
            {
                var quantity = productGroup.Sum(item => item.Quantity);
                var product = await dbContext.Products.SingleOrDefaultAsync(
                    product => product.Id == productGroup.Key,
                    cancellationToken);
                if (product is null) continue;
                product.StockQuantity += quantity;
                product.UpdatedAt = timeProvider.GetUtcNow();
            }
        }
        else if (order.Status == OrderConstants.Statuses.Failed)
        {
            var productQuantities = order.Items
                .GroupBy(item => item.ProductId)
                .ToDictionary(group => group.Key, group => group.Sum(item => item.Quantity));
            var products = await dbContext.Products
                .Where(product => productQuantities.Keys.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id, cancellationToken);

            if (productQuantities.Any(item =>
                    !products.TryGetValue(item.Key, out var product) ||
                    !product.IsActive ||
                    product.StockQuantity < item.Value))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["status"] = ["This failed order cannot be reopened because one or more products do not have enough stock."]
                });

            foreach (var item in productQuantities)
            {
                products[item.Key].StockQuantity -= item.Value;
                products[item.Key].UpdatedAt = timeProvider.GetUtcNow();
            }
        }

        order.Status = nextStatus;
        order.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.Ok(order.ToResponse());
    }

    private static async Task<IResult> UpdatePaymentMethodAsync(
        Guid id,
        UpdateOrderPaymentMethodRequest? request,
        AppDbContext dbContext,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        if (request?.PaymentMethod is not (OrderConstants.CashOnDelivery or OrderConstants.BanglaQr))
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["paymentMethod"] = ["Select cash on delivery or Bangla QR."]
            });

        var order = await dbContext.Orders
            .Include(item => item.Items)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (order is null) return Results.NotFound();

        order.PaymentMethod = request.PaymentMethod;
        order.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.Ok(order.ToResponse());
    }

    private static string NormalizeStatus(string status) =>
        OrderConstants.Statuses.All.Single(item =>
            string.Equals(item, status.Trim(), StringComparison.OrdinalIgnoreCase));

    private static string DisplayStatus(string status) => status switch
    {
        OrderConstants.Statuses.NotConfirmed => "not confirmed",
        OrderConstants.Statuses.InProgress => "in progress",
        OrderConstants.Statuses.DeliveryInProgress => "delivery in progress",
        _ => status.ToLowerInvariant()
    };
}
