using System.ComponentModel.DataAnnotations;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;

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

        var createResult = await userManager.CreateAsync(user, request.Password!);
        if (!createResult.Succeeded)
        {
            return Results.ValidationProblem(ToValidationErrors(createResult));
        }

        var roleResult = await userManager.AddToRoleAsync(user, RoleNames.Customer);
        if (!roleResult.Succeeded)
        {
            await userManager.DeleteAsync(user);
            return Results.ValidationProblem(ToValidationErrors(roleResult));
        }

        await signInManager.SignInAsync(user, isPersistent: false);

        var response = new RegisterResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            RoleNames.Customer);

        return Results.Created("/api/auth/me", response);
    }

    private static Dictionary<string, string[]> Validate(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        ValidateName(request.FirstName, "firstName", "First name", errors);
        ValidateName(request.LastName, "lastName", "Last name", errors);

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

    private static void ValidateName(
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
