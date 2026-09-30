using System.ComponentModel.DataAnnotations;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Auth.Register;

internal static class RegisterEndpoint
{
    public static RouteGroupBuilder MapRegisterEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/register", HandleAsync)
            .AllowAnonymous()
            .WithName("Register")
            .Produces<RegisterResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        return group;
    }

    private static async Task<IResult> HandleAsync(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        AppDbContext dbContext,
        TimeProvider timeProvider)
    {
        var validationErrors = Validate(request);
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
            return Results.ValidationProblem(ToValidationErrors(result));
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

    private static Dictionary<string, string[]> Validate(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        AddNameValidationError(request.FirstName, "firstName", "First name", errors);
        AddNameValidationError(request.LastName, "lastName", "Last name", errors);

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors["email"] = ["Email is required."];
        }
        else if (request.Email.Length > 256 ||
                 !new EmailAddressAttribute().IsValid(request.Email.Trim()))
        {
            errors["email"] = ["Enter a valid email address."];
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            errors["password"] = ["Password is required."];
        }
        else if (request.Password.Length > 128)
        {
            errors["password"] = ["Password must not exceed 128 characters."];
        }

        return errors;
    }

    private static void AddNameValidationError(
        string? value,
        string key,
        string displayName,
        Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{displayName} is required."];
        }
        else if (value.Trim().Length > 100)
        {
            errors[key] = [$"{displayName} must not exceed 100 characters."];
        }
    }

    private static Dictionary<string, string[]> ToValidationErrors(
        IdentityResult result) =>
        result.Errors
            .GroupBy(error => error.Code, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.Description).ToArray(),
                StringComparer.Ordinal);

    internal sealed record RegisterRequest(
        string? FirstName,
        string? LastName,
        string? Email,
        string? Password);

    internal sealed record RegisterResponse(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        string Role);
}
