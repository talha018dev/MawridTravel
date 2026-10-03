using System.Net;
using System.Net.Http.Json;
using MawridTravel.Api.Domain.Authorization;

namespace MawridTravel.Api.Tests;

public sealed class MeTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Me_WhenAuthenticated_ReturnsCurrentUser()
    {
        using var client = factory.CreateClient();
        var email = $"me-{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Current",
            lastName = "User",
            email,
            password = "Travel123"
        });
        registerResponse.EnsureSuccessStatusCode();
        var verifyResponse = await client.PostAsJsonAsync("/api/auth/verify-otp", new
        {
            email,
            otp = "000000"
        });
        verifyResponse.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();
        Assert.NotNull(body);
        Assert.Equal("Current", body.FirstName);
        Assert.Equal("User", body.LastName);
        Assert.Equal(email, body.Email);
        Assert.Contains(RoleNames.Customer, body.Roles);
    }

    [Fact]
    public async Task Me_WhenAnonymous_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private sealed record MeResponse(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        IList<string> Roles);
}
