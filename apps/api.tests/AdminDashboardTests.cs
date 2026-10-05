using System.Net;
using System.Net.Http.Json;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MawridTravel.Api.Tests;

public sealed class AdminDashboardTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Dashboard_WhenAnonymous_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/admin/dashboard");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Dashboard_WhenCustomer_ReturnsForbidden()
    {
        using var client = factory.CreateClient();
        var email = $"dashboard-customer-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(email, RoleNames.Customer);
        await LoginAsync(client, email);

        var response = await client.GetAsync("/api/admin/dashboard");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Dashboard_WhenAdmin_ReturnsSummary()
    {
        using var client = factory.CreateClient();
        var email = $"dashboard-admin-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(email, RoleNames.Admin);
        await LoginAsync(client, email);

        var response = await client.GetAsync("/api/admin/dashboard");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<DashboardResponse>();
        Assert.NotNull(body);
        Assert.True(body.TotalUsers >= 1);
        Assert.True(body.TotalAdmins >= 1);
        Assert.True(body.TotalCustomers >= 0);
    }

    private async Task CreateUserAsync(string email, string role)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();
        var now = DateTimeOffset.UtcNow;
        var user = new ApplicationUser
        {
            FirstName = "Dashboard",
            LastName = role,
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        Assert.True((await userManager.CreateAsync(user, "Travel123")).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(user, role)).Succeeded);
    }

    private static async Task LoginAsync(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "Travel123",
            rememberMe = false
        });

        response.EnsureSuccessStatusCode();
    }

    private sealed record DashboardResponse(
        int TotalUsers,
        int TotalCustomers,
        int TotalAdmins);
}
