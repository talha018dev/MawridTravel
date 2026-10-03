using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace MawridTravel.Api.Features.Auth.ResendOtp;

internal static class ResendOtpEndpoint
{
    public static RouteGroupBuilder MapResendOtpEndpoint(this RouteGroupBuilder group)
    {
        group.MapPost("/resend-otp", HandleAsync)
            .AllowAnonymous()
            .WithName("ResendRegistrationOtp")
            .Produces<ResendOtpResponse>()
            .ProducesValidationProblem();

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ResendOtpRequest request,
        UserManager<ApplicationUser> userManager)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return Results.ValidationProblem(
                new Dictionary<string, string[]>(StringComparer.Ordinal)
                {
                    ["email"] = ["Email is required."]
                });
        }

        var email = request.Email.Trim();
        _ = await userManager.FindByEmailAsync(email);

        // Keep this response generic so the endpoint does not reveal account existence.
        return Results.Ok(new ResendOtpResponse(
            "If an unverified account exists, a verification code has been sent."));
    }

    internal sealed record ResendOtpRequest(string? Email);
    internal sealed record ResendOtpResponse(string Message);
}
