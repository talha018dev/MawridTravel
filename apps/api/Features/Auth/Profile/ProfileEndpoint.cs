using System.Security.Claims;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace MawridTravel.Api.Features.Auth.Profile;

internal static class ProfileEndpoint
{
    public static RouteGroupBuilder MapProfileEndpoint(this RouteGroupBuilder group)
    {
        group.MapPut("/profile", HandleAsync)
            .RequireAuthorization()
            .WithName("UpdateCurrentUserProfile")
            .Produces<ProfileResponse>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ProfileRequest request,
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> userManager,
        TimeProvider timeProvider)
    {
        var errors = Validate(request);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        user.FirstName = request.FirstName!.Trim();
        user.LastName = request.LastName!.Trim();
        user.PhoneNumber = NormalizeOptional(request.PhoneNumber);
        user.Address = NormalizeOptional(request.Address);
        user.UpdatedAt = timeProvider.GetUtcNow();

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return Results.ValidationProblem(ToValidationErrors(result));
        }

        var roles = await userManager.GetRolesAsync(user);
        return Results.Ok(new ProfileResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email!,
            user.PhoneNumber,
            user.Address,
            roles));
    }

    private static Dictionary<string, string[]> Validate(ProfileRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);
        ValidateRequired(errors, "firstName", request.FirstName, 100, "First name");
        ValidateRequired(errors, "lastName", request.LastName, 100, "Last name");

        if (request.PhoneNumber?.Trim().Length > 30)
            errors["phoneNumber"] = ["Phone number must not exceed 30 characters."];
        if (request.Address?.Trim().Length > 500)
            errors["address"] = ["Address must not exceed 500 characters."];
        return errors;
    }

    private static void ValidateRequired(Dictionary<string, string[]> errors, string key, string? value, int maxLength, string label)
    {
        if (string.IsNullOrWhiteSpace(value)) errors[key] = [$"{label} is required."];
        else if (value.Trim().Length > maxLength) errors[key] = [$"{label} must not exceed {maxLength} characters."];
    }

    private static Dictionary<string, string[]> ToValidationErrors(IdentityResult result) =>
        result.Errors.GroupBy(error => error.Code.Contains("Email", StringComparison.OrdinalIgnoreCase) ? "email" : "profile")
            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray(), StringComparer.Ordinal);

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    internal sealed record ProfileRequest(string? FirstName, string? LastName, string? PhoneNumber, string? Address);
    internal sealed record ProfileResponse(Guid Id, string FirstName, string LastName, string Email, string? PhoneNumber, string? Address, IList<string> Roles);
}
