using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Features.Orders;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Admin.Dashboard;

internal static class DashboardEndpoint
{
    public static RouteGroupBuilder MapDashboardEndpoint(this RouteGroupBuilder group)
    {
        group.MapGet("/dashboard", HandleAsync)
            .WithName("GetAdminDashboard")
            .Produces<DashboardResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AppDbContext dbContext,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();
        var last24Hours = now.AddHours(-24);
        var last30Days = now.AddDays(-30);
        var totalUsers = await dbContext.Users.CountAsync(cancellationToken);
        var newCustomersLast30Days = await dbContext.Users
            .Where(user => user.CreatedAt >= last30Days)
            .Join(
                dbContext.UserRoles,
                user => user.Id,
                userRole => userRole.UserId,
                (user, userRole) => userRole.RoleId)
            .Join(
                dbContext.Roles.Where(role => role.Name == RoleNames.Customer),
                roleId => roleId,
                role => role.Id,
                (_, _) => 1)
            .CountAsync(cancellationToken);
        var roleCounts = await dbContext.UserRoles
            .Join(
                dbContext.Roles,
                userRole => userRole.RoleId,
                role => role.Id,
                (userRole, role) => role.Name)
            .Where(roleName =>
                roleName == RoleNames.Customer || roleName == RoleNames.Admin)
            .GroupBy(roleName => roleName)
            .Select(group => new { RoleName = group.Key, Count = group.Count() })
            .ToDictionaryAsync(
                item => item.RoleName!,
                item => item.Count,
                cancellationToken);

        roleCounts.TryGetValue(RoleNames.Customer, out var totalCustomers);
        roleCounts.TryGetValue(RoleNames.Admin, out var totalAdmins);

        var orderMetrics = await dbContext.Orders
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalOrders = group.Count(),
                OrdersLast24Hours = group.Count(order => order.CreatedAt >= last24Hours),
                AwaitingConfirmation = group.Count(order => order.Status == OrderConstants.Statuses.NotConfirmed),
                ActiveFulfilment = group.Count(order =>
                    order.Status == OrderConstants.Statuses.Confirmed ||
                    order.Status == OrderConstants.Statuses.InProgress ||
                    order.Status == OrderConstants.Statuses.DeliveryInProgress),
                DeliveredOrders = group.Count(order =>
                    order.Status == OrderConstants.Statuses.Delivered ||
                    order.Status == OrderConstants.Statuses.Completed),
                UnpaidBanglaQr = group.Count(order => order.PaymentMethod == OrderConstants.UnpaidBanglaQr),
                CollectedRevenue = group.Sum(order =>
                    order.Status != OrderConstants.Statuses.Failed &&
                    (order.PaymentMethod == OrderConstants.PaidBanglaQr ||
                     order.PaymentMethod == OrderConstants.CashOnDelivery &&
                     (order.Status == OrderConstants.Statuses.Delivered || order.Status == OrderConstants.Statuses.Completed))
                        ? order.Total
                        : 0m),
                OpenOrderValue = group.Sum(order =>
                    order.Status != OrderConstants.Statuses.Failed &&
                    order.Status != OrderConstants.Statuses.Delivered &&
                    order.Status != OrderConstants.Statuses.Completed
                        ? order.Total
                        : 0m)
            })
            .SingleOrDefaultAsync(cancellationToken);

        var productMetrics = await dbContext.Products
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalProducts = group.Count(),
                ActiveProducts = group.Count(product => product.IsActive),
                LowStockProducts = group.Count(product => product.IsActive && product.StockQuantity > 0 && product.StockQuantity <= 5),
                OutOfStockProducts = group.Count(product => product.IsActive && product.StockQuantity == 0)
            })
            .SingleOrDefaultAsync(cancellationToken);

        var publishedBlogs = await dbContext.BlogPosts
            .CountAsync(blog => blog.IsPublished, cancellationToken);
        var recentOrders = await dbContext.Orders
            .AsNoTracking()
            .OrderByDescending(order => order.CreatedAt)
            .Take(5)
            .Select(order => new RecentOrderResponse(
                order.Id,
                order.OrderNumber,
                order.FullName,
                order.Status,
                order.PaymentMethod,
                order.Total,
                order.Currency,
                order.CreatedAt))
            .ToArrayAsync(cancellationToken);

        return Results.Ok(new DashboardResponse(
            totalUsers,
            totalCustomers,
            totalAdmins,
            newCustomersLast30Days,
            orderMetrics?.TotalOrders ?? 0,
            orderMetrics?.OrdersLast24Hours ?? 0,
            orderMetrics?.AwaitingConfirmation ?? 0,
            orderMetrics?.ActiveFulfilment ?? 0,
            orderMetrics?.DeliveredOrders ?? 0,
            orderMetrics?.UnpaidBanglaQr ?? 0,
            orderMetrics?.CollectedRevenue ?? 0,
            orderMetrics?.OpenOrderValue ?? 0,
            productMetrics?.TotalProducts ?? 0,
            productMetrics?.ActiveProducts ?? 0,
            productMetrics?.LowStockProducts ?? 0,
            productMetrics?.OutOfStockProducts ?? 0,
            publishedBlogs,
            recentOrders));
    }

    internal sealed record DashboardResponse(
        int TotalUsers,
        int TotalCustomers,
        int TotalAdmins,
        int NewCustomersLast30Days,
        int TotalOrders,
        int OrdersLast24Hours,
        int AwaitingConfirmation,
        int ActiveFulfilment,
        int DeliveredOrders,
        int UnpaidBanglaQr,
        decimal CollectedRevenue,
        decimal OpenOrderValue,
        int TotalProducts,
        int ActiveProducts,
        int LowStockProducts,
        int OutOfStockProducts,
        int PublishedBlogs,
        IReadOnlyList<RecentOrderResponse> RecentOrders);

    internal sealed record RecentOrderResponse(
        Guid Id,
        string OrderNumber,
        string CustomerName,
        string Status,
        string PaymentMethod,
        decimal Total,
        string Currency,
        DateTimeOffset CreatedAt);
}
