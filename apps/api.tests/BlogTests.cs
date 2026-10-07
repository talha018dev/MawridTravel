using System.Net;
using System.Net.Http.Json;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MawridTravel.Api.Tests;

public sealed class BlogTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task CreateBlog_WhenAnonymous_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/admin/blogs",
            CreateRequest("Anonymous blog"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateBlog_WhenCustomer_ReturnsForbidden()
    {
        using var client = factory.CreateClient();
        var email = $"blog-customer-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(email, RoleNames.Customer);
        await LoginAsync(client, email);

        var response = await client.PostAsJsonAsync(
            "/api/admin/blogs",
            CreateRequest("Customer blog"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanCreateReadUpdateListAndDeleteBlog()
    {
        using var client = await CreateAdminClientAsync();
        var title = $"Planning Umrah {Guid.NewGuid():N}";

        var createResponse = await client.PostAsJsonAsync(
            "/api/admin/blogs",
            CreateRequest(title, isPublished: false));

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<BlogResponse>();
        Assert.NotNull(created);
        Assert.StartsWith("planning-umrah-", created.Slug);
        Assert.False(created.IsPublished);
        Assert.Null(created.PublishedAt);

        var getResponse = await client.GetAsync($"/api/admin/blogs/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/admin/blogs/{created.Id}",
            CreateRequest(
                "A complete Umrah guide",
                slug: "complete-umrah-guide",
                isPublished: true));

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<BlogResponse>();
        Assert.NotNull(updated);
        Assert.Equal("complete-umrah-guide", updated.Slug);
        Assert.True(updated.IsPublished);
        Assert.NotNull(updated.PublishedAt);

        var listResponse = await client.GetFromJsonAsync<BlogListResponse>(
            "/api/admin/blogs?search=complete&isPublished=true&page=1&pageSize=20");
        Assert.NotNull(listResponse);
        Assert.Contains(listResponse.Items, blog => blog.Id == created.Id);

        var deleteResponse = await client.DeleteAsync($"/api/admin/blogs/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var deletedResponse = await client.GetAsync($"/api/admin/blogs/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, deletedResponse.StatusCode);
    }

    [Fact]
    public async Task CreateBlog_WithInvalidContent_ReturnsValidationProblem()
    {
        using var client = await CreateAdminClientAsync();

        var response = await client.PostAsJsonAsync("/api/admin/blogs", new
        {
            title = "",
            slug = "",
            excerpt = "",
            content = "",
            featuredImageUrl = "not-a-url",
            isPublished = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task DeleteBlog_WhenBlogDoesNotExist_ReturnsNotFound()
    {
        using var client = await CreateAdminClientAsync();

        var response = await client.DeleteAsync($"/api/admin/blogs/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task<HttpClient> CreateAdminClientAsync()
    {
        var client = factory.CreateClient();
        var email = $"blog-admin-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(email, RoleNames.Admin);
        await LoginAsync(client, email);
        return client;
    }

    private async Task CreateUserAsync(string email, string role)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var now = DateTimeOffset.UtcNow;
        var user = new ApplicationUser
        {
            FirstName = "Blog",
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

    private static object CreateRequest(
        string title,
        string? slug = null,
        bool isPublished = true) => new
        {
            title,
            slug,
            excerpt = "Helpful travel advice.",
            content = "Detailed advice for planning a comfortable journey.",
            featuredImageUrl = "https://images.mawridtravel.com/blog/example.jpg",
            isPublished
        };

    private sealed record BlogResponse(
        Guid Id,
        string Title,
        string Slug,
        bool IsPublished,
        DateTimeOffset? PublishedAt);

    private sealed record BlogListResponse(
        int Page,
        int PageSize,
        int TotalCount,
        IReadOnlyList<BlogResponse> Items);
}
