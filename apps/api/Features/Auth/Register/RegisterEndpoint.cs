using System.Text.Json.Nodes;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using static MawridTravel.Api.Features.Auth.Register.RegisterRecords;

namespace MawridTravel.Api.Features.Auth.Register;

internal static class RegisterEndpoint
{
    public static RouteGroupBuilder MapRegisterEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/register", HandleAsync)
            .AllowAnonymous()
            .WithName("Register")
            .Produces<RegisterResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .AddOpenApiOperationTransformer((operation, _, _) =>
            {
                if (operation.RequestBody?.Content is { } content &&
                    content.TryGetValue(
                        "application/json",
                        out var mediaType) == true)
                {
                    mediaType.Example = JsonNode.Parse(
                        """
                        {
                        "firstName": "Talha",
                        "lastName": "Jubaer",
                        "email": "talha@example.com",
                        "password": "Travel123"
                        }
                        """);
                }

                return Task.CompletedTask;
            });

        return group;
    }

    private static async Task<IResult> HandleAsync(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        AppDbContext dbContext,
        TimeProvider timeProvider)
    {
        var validationErrors = RegisterValidator.Validate(request);
        if (validationErrors.Count > 0)
        {
            return Results.ValidationProblem(validationErrors);
        }

        var email = request.Email!.Trim();
        var now = timeProvider.GetUtcNow();
        var user = new ApplicationUser
        {
            FirstName = request.FirstName!.Trim(),
            LastName = request.LastName!.Trim(),
            UserName = email,
            Email = email,
            CreatedAt = now,
            UpdatedAt = now
        };

        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        var result = await executionStrategy.ExecuteAsync(() =>
            CreateUserAndAssignRoleAsync(
                user,
                request.Password!,
                userManager,
                dbContext));

        if (!result.Succeeded)
        {
            return Results.ValidationProblem(RegisterValidator.ToValidationErrors(result));
        }

        // Do not issue a login cookie until the database transaction has committed.
        await signInManager.SignInAsync(user, isPersistent: false);

        var response = new RegisterResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            RoleNames.Customer);

        return Results.Created("/api/auth/me", response);
    }

    private static async Task<IdentityResult> CreateUserAndAssignRoleAsync(
        ApplicationUser user,
        string password,
        UserManager<ApplicationUser> userManager,
        AppDbContext dbContext)
    {
        await using var transaction =
            await dbContext.Database.BeginTransactionAsync();

        var createResult = await userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            return createResult;
        }

        var roleResult = await userManager.AddToRoleAsync(user, RoleNames.Customer);
        if (!roleResult.Succeeded)
        {
            return roleResult;
        }

        await transaction.CommitAsync();

        return IdentityResult.Success;
    }

    

    
}
