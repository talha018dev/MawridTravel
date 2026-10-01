using System.Net;
using System.Net.Http.Json;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MawridTravel.Api.Tests;

public sealed class LoginTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Login_WithCorrectPassword_ReturnsUserAndAuthenticationCookie()
    {
        var email = $"login-{Guid.NewGuid():N}@example.com";
        await CreateCustomerAsync(email, "Travel123");
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "Travel123",
            rememberMe = false
        });

        Assert.True(
            response.StatusCode == HttpStatusCode.OK,
            await response.Content.ReadAsStringAsync());
        Assert.Contains(
            response.Headers.GetValues("Set-Cookie"),
            value => value.StartsWith("mawrid.auth=", StringComparison.Ordinal));

        var body = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.Equal(email, body.Email);
        Assert.Contains(RoleNames.Customer, body.Roles);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorizedAndTracksFailure()
    {
        var email = $"failed-login-{Guid.NewGuid():N}@example.com";
        await CreateCustomerAsync(email, "Travel123");
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "Wrong123",
            rememberMe = false
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));

        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync(email);

        Assert.NotNull(user);
        Assert.Equal(1, user.AccessFailedCount);
    }

    [Fact]
    public async Task Login_WithMissingFields_ReturnsValidationProblem()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "",
            password = "",
            rememberMe = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "application/problem+json",
            response.Content.Headers.ContentType?.MediaType);
    }

    private async Task CreateCustomerAsync(string email, string password)
    {
        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();
        var now = DateTimeOffset.UtcNow;
        var user = new ApplicationUser
        {
            FirstName = "Login",
            LastName = "Customer",
            UserName = email,
            Email = email,
            CreatedAt = now,
            UpdatedAt = now
        };

        var createResult = await userManager.CreateAsync(user, password);
        Assert.True(createResult.Succeeded);

        var roleResult = await userManager.AddToRoleAsync(user, RoleNames.Customer);
        Assert.True(roleResult.Succeeded);
    }

    private sealed record LoginResponse(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        IList<string> Roles);
}
