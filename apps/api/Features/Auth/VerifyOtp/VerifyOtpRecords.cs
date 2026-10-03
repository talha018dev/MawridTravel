namespace MawridTravel.Api.Features.Auth.VerifyOtp;

internal static class VerifyOtpRecords
{
    internal sealed record VerifyOtpRequest(string? Email, string? Otp);

    internal sealed record VerifyOtpResponse(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        IList<string> Roles);
}
