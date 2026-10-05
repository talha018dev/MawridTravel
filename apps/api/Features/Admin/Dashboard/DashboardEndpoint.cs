using MawridTravel.Api.Domain.Authorization;
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
        CancellationToken cancellationToken)
    {
        var totalUsers = await dbContext.Users.CountAsync(cancellationToken);
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

        return Results.Ok(new DashboardResponse(
            totalUsers,
            totalCustomers,
            totalAdmins));
    }

    internal sealed record DashboardResponse(
        int TotalUsers,
        int TotalCustomers,
        int TotalAdmins);
}
