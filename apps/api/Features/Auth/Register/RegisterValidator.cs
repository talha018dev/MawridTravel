using EmailValidation;
using Microsoft.AspNetCore.Identity;
using static MawridTravel.Api.Features.Auth.Register.RegisterRecords;

namespace MawridTravel.Api.Features.Auth.Register;

internal static class RegisterValidator
{
    internal static Dictionary<string, string[]> Validate(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        AddNameValidationError(request.FirstName, "firstName", "First name", errors);
        AddNameValidationError(request.LastName, "lastName", "Last name", errors);

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

    internal static Dictionary<string, string[]> ToValidationErrors(
        IdentityResult result) =>
        result.Errors
            .GroupBy(error => error.Code, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.Description).ToArray(),
                StringComparer.Ordinal);

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
}
