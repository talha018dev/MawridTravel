using Microsoft.AspNetCore.Identity;

namespace MawridTravel.Api.Domain.Entities;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public string? Address { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
