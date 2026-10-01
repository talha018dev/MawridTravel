using System.Security.Claims;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace MawridTravel.Api.Features.Auth.Me;

internal static class MeEndpoint
{
    public static RouteGroupBuilder MapMeEndpoint(this RouteGroupBuilder group)
    {
        group.MapGet("/me", HandleAsync)
            .RequireAuthorization()
            .WithName("GetCurrentUser")
            .Produces<MeResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            return Results.Unauthorized();
        }

        var roles = await userManager.GetRolesAsync(user);

        return Results.Ok(new MeResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            roles));
    }

    internal sealed record MeResponse(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        IList<string> Roles);
}
