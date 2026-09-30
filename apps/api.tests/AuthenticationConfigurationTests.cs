using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace MawridTravel.Api.Tests;

public sealed class AuthenticationConfigurationTests(ApiFactory factory)
    : IClassFixture<ApiFactory>
{
    [Fact]
    public void IdentityServices_AreRegisteredWithExpectedRules()
    {
        using var scope = factory.Services.CreateScope();

        Assert.NotNull(scope.ServiceProvider.GetService<UserManager<ApplicationUser>>());
        Assert.NotNull(scope.ServiceProvider.GetService<SignInManager<ApplicationUser>>());

        var options = scope.ServiceProvider
            .GetRequiredService<IOptions<IdentityOptions>>()
            .Value;

        Assert.True(options.User.RequireUniqueEmail);
        Assert.Equal(8, options.Password.RequiredLength);
        Assert.True(options.Password.RequireUppercase);
        Assert.True(options.Password.RequireLowercase);
        Assert.True(options.Password.RequireDigit);
        Assert.False(options.Password.RequireNonAlphanumeric);
        Assert.Equal(5, options.Lockout.MaxFailedAccessAttempts);
        Assert.Equal(TimeSpan.FromMinutes(15), options.Lockout.DefaultLockoutTimeSpan);
    }

    [Fact]
    public void ApplicationCookie_IsConfiguredForTheApi()
    {
        var options = factory.Services
            .GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get(IdentityConstants.ApplicationScheme);

        Assert.Equal("mawrid.auth", options.Cookie.Name);
        Assert.True(options.Cookie.HttpOnly);
        Assert.Equal(SameSiteMode.Lax, options.Cookie.SameSite);
        Assert.Equal(CookieSecurePolicy.SameAsRequest, options.Cookie.SecurePolicy);
        Assert.Equal(TimeSpan.FromHours(8), options.ExpireTimeSpan);
        Assert.True(options.SlidingExpiration);
    }
}
