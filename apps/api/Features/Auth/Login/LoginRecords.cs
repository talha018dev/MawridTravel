namespace MawridTravel.Api.Features.Auth.Login;

internal record class LoginRecords
{
    internal sealed record LoginRequest(
            string? Email,
            string? Password,
            bool RememberMe);

    internal sealed record LoginResponse(
            Guid Id,
            string FirstName,
            string LastName,
            string Email,
            IList<string> Roles);
}
