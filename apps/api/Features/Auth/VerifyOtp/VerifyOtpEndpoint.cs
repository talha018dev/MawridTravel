using System.Text.Json.Nodes;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using static MawridTravel.Api.Features.Auth.VerifyOtp.VerifyOtpRecords;

namespace MawridTravel.Api.Features.Auth.VerifyOtp;

internal static class VerifyOtpEndpoint
{
    private const string DevelopmentOtp = "000000";

    public static RouteGroupBuilder MapVerifyOtpEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/verify-otp", HandleAsync)
            .AllowAnonymous()
            .WithName("VerifyRegistrationOtp")
            .Produces<VerifyOtpResponse>()
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
                          "otp": "000000"
                        }
                        """);
                }

                return Task.CompletedTask;
            });

        return group;
    }

    private static async Task<IResult> HandleAsync(
        VerifyOtpRequest request,
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
        var user = await userManager.FindByEmailAsync(email);

        if (user is null || request.Otp != DevelopmentOtp)
        {
            return InvalidOtp();
        }

        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            user.UpdatedAt = timeProvider.GetUtcNow();
            var result = await userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return Results.ValidationProblem(
                    result.Errors
                        .GroupBy(error => error.Code, StringComparer.Ordinal)
                        .ToDictionary(
                            group => group.Key,
                            group => group.Select(error => error.Description).ToArray(),
                            StringComparer.Ordinal));
            }
        }

        await signInManager.SignInAsync(user, isPersistent: false);
        var roles = await userManager.GetRolesAsync(user);

        return Results.Ok(new VerifyOtpResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email ?? email,
            roles));
    }

    private static Dictionary<string, string[]> Validate(VerifyOtpRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors["email"] = ["Email is required."];
        }

        if (string.IsNullOrWhiteSpace(request.Otp) ||
            request.Otp.Length != 6 ||
            request.Otp.Any(character => !char.IsAsciiDigit(character)))
        {
            errors["otp"] = ["OTP must contain exactly 6 digits."];
        }

        return errors;
    }

    private static IResult InvalidOtp() => Results.ValidationProblem(
        new Dictionary<string, string[]>(StringComparer.Ordinal)
        {
            ["otp"] = ["The OTP is invalid."]
        });
}
