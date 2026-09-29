using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Tests;

public sealed class AuthenticationEntityModelTests
{
    [Fact]
    public void IdentityModel_ConfiguresApplicationUserAndRole()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=model_tests;Username=tests;Password=tests")
            .Options;

        using var dbContext = new AppDbContext(options);
        var user = dbContext.Model.FindEntityType(typeof(ApplicationUser));
        var role = dbContext.Model.FindEntityType(typeof(ApplicationRole));

        Assert.NotNull(user);
        Assert.NotNull(role);
        Assert.Equal(100, user.FindProperty(nameof(ApplicationUser.FirstName))?.GetMaxLength());
        Assert.Equal(100, user.FindProperty(nameof(ApplicationUser.LastName))?.GetMaxLength());
        Assert.False(user.FindProperty(nameof(ApplicationUser.CreatedAt))?.IsNullable);
        Assert.False(user.FindProperty(nameof(ApplicationUser.UpdatedAt))?.IsNullable);
    }
}
