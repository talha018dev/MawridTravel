using System.Net;
using System.Net.Http.Json;

namespace MawridTravel.Api.Tests;

public sealed class ProfileTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task UpdateProfile_WhenAuthenticated_PersistsContactDetails()
    {
        using var client = factory.CreateClient();
        var originalEmail = $"profile-{Guid.NewGuid():N}@example.com";
        await RegisterAndVerifyAsync(client, originalEmail);
        var response = await client.PutAsJsonAsync("/api/auth/profile", new
        {
            firstName = "Updated",
            lastName = "Traveler",
            email = $"attempted-change-{Guid.NewGuid():N}@example.com",
            phoneNumber = "01700000000",
            address = "Dhaka, Bangladesh"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResponse>();
        Assert.NotNull(profile);
        Assert.Equal("Updated", profile.FirstName);
        Assert.Equal(originalEmail, profile.Email);
        Assert.Equal("01700000000", profile.PhoneNumber);
        Assert.Equal("Dhaka, Bangladesh", profile.Address);

        var me = await client.GetFromJsonAsync<ProfileResponse>("/api/auth/me");
        Assert.NotNull(me);
        Assert.Equal(originalEmail, me.Email);
        Assert.Equal("Dhaka, Bangladesh", me.Address);
    }

    [Fact]
    public async Task UpdateProfile_WhenAnonymous_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();
        var response = await client.PutAsJsonAsync("/api/auth/profile", new
        {
            firstName = "Test", lastName = "User"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static async Task RegisterAndVerifyAsync(HttpClient client, string email)
    {
        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Profile", lastName = "User", email, password = "Travel123"
        });
        register.EnsureSuccessStatusCode();
        var verify = await client.PostAsJsonAsync("/api/auth/verify-otp", new { email, otp = "000000" });
        verify.EnsureSuccessStatusCode();
    }

    private sealed record ProfileResponse(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        string? PhoneNumber,
        string? Address,
        IList<string> Roles);
}
