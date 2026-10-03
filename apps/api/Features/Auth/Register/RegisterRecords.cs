namespace MawridTravel.Api.Features.Auth.Register;

public record class RegisterRecords
{
    internal sealed record RegisterRequest(
            string? FirstName,
            string? LastName,
            string? Email,
            string? Password);

    internal sealed record RegisterResponse(string Email, bool RequiresOtp);
}
