namespace MawridTravel.Api.Features.Auth.Register;

public record class RegisterRecords
{
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
