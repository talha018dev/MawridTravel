using System;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace MawridTravel.Api.Features.Auth.Logout;

public static class LogoutEndpoint
{
    public static RouteGroupBuilder MapLogoutEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/logout", HandleAsync)
            .RequireAuthorization()
            .WithName("Logout")
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private async static Task<IResult> HandleAsync(
        SignInManager<ApplicationUser> signInManager
    )
    {
        await signInManager.SignOutAsync();

        var result = Results.Ok(new { Message = "Logout successful" });

        return result;
    }
}
