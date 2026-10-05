using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Features.Admin.Dashboard;

namespace MawridTravel.Api.Features.Admin;

internal static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints
            .MapGroup("/api/admin")
            .WithTags("Admin")
            .RequireAuthorization(PolicyNames.Admin);

        group.MapDashboardEndpoint();

        return endpoints;
    }
}
