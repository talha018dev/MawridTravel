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
    public async Task Register_CreatesUnconfirmedCustomerWithoutAuthenticationCookie()
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
        Assert.False(response.Headers.Contains("Set-Cookie"));

        var body = await response.Content.ReadFromJsonAsync<RegisterResponse>();
        Assert.NotNull(body);
        Assert.Equal(email, body.Email);
        Assert.True(body.RequiresOtp);

        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync(email);

        Assert.NotNull(user);
        Assert.NotEqual("Travel123", user.PasswordHash);
        Assert.False(user.EmailConfirmed);
        Assert.True(await userManager.IsInRoleAsync(user, RoleNames.Customer));
    }

    [Fact]
    public async Task VerifyOtp_WithDevelopmentCode_ConfirmsAndSignsInCustomer()
    {
        var email = $"verified-{Guid.NewGuid():N}@example.com";
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Verified",
            lastName = "Customer",
            email,
            password = "Travel123"
        });
        registerResponse.EnsureSuccessStatusCode();

        var response = await _client.PostAsJsonAsync("/api/auth/verify-otp", new
        {
            email,
            otp = "000000"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(
            response.Headers.GetValues("Set-Cookie"),
            value => value.StartsWith("mawrid.auth=", StringComparison.Ordinal));

        using var scope = factory.Services.CreateScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync(email);

        Assert.NotNull(user);
        Assert.True(user.EmailConfirmed);
    }

    [Fact]
    public async Task VerifyOtp_WithInvalidCode_ReturnsValidationProblem()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/verify-otp", new
        {
            email = "customer@example.com",
            otp = "123456"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            "application/problem+json",
            response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Register_WhenAccountIsUnconfirmed_ReturnsOtpRequirementAgain()
    {
        var email = $"retry-{Guid.NewGuid():N}@example.com";
        var request = new
        {
            firstName = "Retry",
            lastName = "Customer",
            email,
            password = "Travel123"
        };

        var firstResponse = await _client.PostAsJsonAsync("/api/auth/register", request);
        firstResponse.EnsureSuccessStatusCode();
        var retryResponse = await _client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.Created, retryResponse.StatusCode);
        var body = await retryResponse.Content.ReadFromJsonAsync<RegisterResponse>();
        Assert.NotNull(body);
        Assert.Equal(email, body.Email);
        Assert.True(body.RequiresOtp);
    }

    [Fact]
    public async Task ResendOtp_WithEmail_ReturnsGenericSuccess()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/resend-otp", new
        {
            email = "unknown@example.com"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
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

    private sealed record RegisterResponse(string Email, bool RequiresOtp);
}
