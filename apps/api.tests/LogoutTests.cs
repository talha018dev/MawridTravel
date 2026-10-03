using System.Net;
using System.Net.Http.Json;

namespace MawridTravel.Api.Tests;

public sealed class LogoutTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Logout_WhenAuthenticated_ClearsAuthenticationSession()
    {
        using var client = factory.CreateClient();
        var email = $"logout-{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Logout",
            lastName = "Customer",
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

        var authenticatedResponse = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, authenticatedResponse.StatusCode);

        var logoutResponse = await client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);

        var responseAfterLogout = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, responseAfterLogout.StatusCode);
    }

    [Fact]
    public async Task Logout_WhenAnonymous_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
