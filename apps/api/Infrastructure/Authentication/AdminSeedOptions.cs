namespace MawridTravel.Api.Infrastructure.Authentication;

internal sealed class AdminSeedOptions
{
    public const string SectionName = "AdminSeed";

    public bool Enabled { get; init; }

    public string? Email { get; init; }

    public string? Password { get; init; }

    public string FirstName { get; init; } = "Mawrid";

    public string LastName { get; init; } = "Admin";
}
