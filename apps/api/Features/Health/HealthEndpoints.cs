using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Health;

internal static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/health").WithTags("Health");

        group.MapGet("/", () => Results.Ok(new HealthResponse("healthy")))
            .WithName("GetApiHealth");

        group.MapGet("/database", CheckDatabaseAsync)
            .WithName("GetDatabaseHealth");

        return endpoints;
    }

    private static async Task<IResult> CheckDatabaseAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);

        return canConnect
            ? Results.Ok(new HealthResponse("healthy"))
            : Results.Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "The database is unavailable.");
    }

    private sealed record HealthResponse(string Status);
}
