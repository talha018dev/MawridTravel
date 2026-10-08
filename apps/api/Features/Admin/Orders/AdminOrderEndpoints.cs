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
        UpdateOrderStatusRequest request,
        AppDbContext dbContext,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Status) ||
            !OrderConstants.Statuses.All.Contains(request.Status))
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
        if (!CanTransition(order.Status, nextStatus))
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["status"] = [$"An order cannot move from {DisplayStatus(order.Status)} to {DisplayStatus(nextStatus)}."]
            });

        if (nextStatus == OrderConstants.Statuses.Failed)
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

        order.Status = nextStatus;
        order.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.Ok(order.ToResponse());
    }

    private static bool CanTransition(string currentStatus, string nextStatus) =>
        currentStatus switch
        {
            OrderConstants.Statuses.NotConfirmed => nextStatus is
                OrderConstants.Statuses.Confirmed or OrderConstants.Statuses.Failed,
            OrderConstants.Statuses.Confirmed => nextStatus is
                OrderConstants.Statuses.InProgress or OrderConstants.Statuses.Failed,
            OrderConstants.Statuses.InProgress => nextStatus is
                OrderConstants.Statuses.Completed or OrderConstants.Statuses.Failed,
            _ => false
        };

    private static string NormalizeStatus(string status) =>
        OrderConstants.Statuses.All.Single(item =>
            string.Equals(item, status.Trim(), StringComparison.OrdinalIgnoreCase));

    private static string DisplayStatus(string status) => status switch
    {
        OrderConstants.Statuses.NotConfirmed => "not confirmed",
        OrderConstants.Statuses.InProgress => "in progress",
        _ => status.ToLowerInvariant()
    };
}
