using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MawridTravel.Api.Tests;

public sealed class AdminSeedingTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Startup_WithAdminSeedConfiguration_CreatesAdminUser()
    {
        var email = $"seeded-admin-{Guid.NewGuid():N}@example.com";
        using var seededFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("AdminSeed:Enabled", "true");
            builder.UseSetting("AdminSeed:Email", email);
            builder.UseSetting("AdminSeed:Password", "AdminPass123");
            builder.UseSetting("AdminSeed:FirstName", "Seeded");
            builder.UseSetting("AdminSeed:LastName", "Administrator");
        });

        _ = seededFactory.CreateClient();

        await using var scope = seededFactory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync(email);

        Assert.NotNull(user);
        Assert.Equal("Seeded", user.FirstName);
        Assert.Equal("Administrator", user.LastName);
        Assert.True(await userManager.IsInRoleAsync(user, RoleNames.Admin));
    }
}
