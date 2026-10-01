using System.Text.Json.Nodes;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using static MawridTravel.Api.Features.Auth.Login.LoginRecords;

namespace MawridTravel.Api.Features.Auth.Login;

internal static class LoginEndpoint
{
    public static RouteGroupBuilder MapLoginEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/login", HandleAsync)
            .AllowAnonymous()
            .WithName("Login")
            .Produces<LoginResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesValidationProblem()
            .AddOpenApiOperationTransformer((operation, _, _) =>
            {
                if (operation.RequestBody?.Content is { } content &&
                    content.TryGetValue("application/json", out var mediaType))
                {
                    mediaType.Example = JsonNode.Parse(
                        """
                        {
                          "email": "talha@example.com",
                          "password": "Travel123",
                          "rememberMe": false
                        }
                        """);
                }

                return Task.CompletedTask;
            });

        return group;
    }

    private static async Task<IResult> HandleAsync(
        LoginRequest request,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager)
    {
        var validationErrors = LoginValidator.Validate(request);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        var email = request.Email!.Trim();
        var user = await userManager.FindByEmailAsync(email);

        if (user is null)
        {
            return InvalidCredentials();
        }

        var signInResult = await signInManager.PasswordSignInAsync(
            user,
            request.Password!,
            request.RememberMe,
            lockoutOnFailure: true);

        if (!signInResult.Succeeded)
        {
            return InvalidCredentials();
        }

        var roles = await userManager.GetRolesAsync(user);

        return Results.Ok(new LoginResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email ?? email,
            roles));
    }

    private static IResult InvalidCredentials() => Results.Problem(
        statusCode: StatusCodes.Status401Unauthorized,
        title: "Invalid email or password.");
}
