using System.Net;
using System.Net.Http.Json;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MawridTravel.Api.Tests;

public sealed class RegistrationTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Startup_SeedsRequiredRoles()
    {
        using var scope = factory.Services.CreateScope();
        var roleManager = scope.ServiceProvider
            .GetRequiredService<RoleManager<ApplicationRole>>();

        Assert.True(await roleManager.RoleExistsAsync(RoleNames.Admin));
        Assert.True(await roleManager.RoleExistsAsync(RoleNames.Customer));
    }

    [Fact]
    public async Task Register_CreatesCustomerAndAuthenticationCookie()
    {
        var email = $"customer-{Guid.NewGuid():N}@example.com";
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "  Talha ",
            lastName = " Jubaer  ",
            email,
            password = "Travel123"
        });

        Assert.True(
            response.StatusCode == HttpStatusCode.Created,
            await response.Content.ReadAsStringAsync());
        Assert.Contains(
            response.Headers.GetValues("Set-Cookie"),
            value => value.StartsWith("mawrid.auth=", StringComparison.Ordinal));

        var body = await response.Content.ReadFromJsonAsync<RegisterResponse>();
        Assert.NotNull(body);
        Assert.Equal("Talha", body.FirstName);
        Assert.Equal("Jubaer", body.LastName);
        Assert.Equal(email, body.Email);
        Assert.Equal(RoleNames.Customer, body.Role);

        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync(email);

        Assert.NotNull(user);
        Assert.NotEqual("Travel123", user.PasswordHash);
        Assert.True(await userManager.IsInRoleAsync(user, RoleNames.Customer));
    }

    [Fact]
    public async Task Register_WithInvalidInput_ReturnsValidationProblem()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "",
            lastName = "",
            email = "not-an-email",
            password = "weak"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "application/problem+json",
            response.Content.Headers.ContentType?.MediaType);
    }

    private sealed record RegisterResponse(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        string Role);
}
