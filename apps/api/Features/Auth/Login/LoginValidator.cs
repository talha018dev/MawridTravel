using EmailValidation;
using static MawridTravel.Api.Features.Auth.Login.LoginRecords;

namespace MawridTravel.Api.Features.Auth.Login;

internal static class LoginValidator
{
    internal static Dictionary<string, string[]> Validate(LoginRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors["email"] = ["Email is required."];
        }
        else if (request.Email.Length > 256 ||
                 !EmailValidator.Validate(request.Email.Trim()))
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
}
