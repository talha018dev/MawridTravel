using System.Net;
using System.Net.Http.Json;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Storage;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

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
            isPublished = false
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task CreateBlog_SanitizesRichTextContent()
    {
        using var client = await CreateAdminClientAsync();

        var response = await client.PostAsJsonAsync("/api/admin/blogs", new
        {
            title = $"Safe rich text {Guid.NewGuid():N}",
            slug = (string?)null,
            excerpt = "Sanitizer test.",
            content = "<h2>Safe heading</h2><p onclick=\"alert(1)\"><strong>Safe text</strong>" +
                      "<script>alert(2)</script><img src=x onerror=\"alert(3)\">" +
                      "<a href=\"javascript:alert(4)\">Unsafe link</a>" +
                      "<a href=\"https://example.com\">Safe link</a></p>",
            isPublished = false
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var blog = await response.Content.ReadFromJsonAsync<BlogResponse>();
        Assert.NotNull(blog);
        var normalizedContent = blog.Content.ToLowerInvariant();
        Assert.Contains("<h2>safe heading</h2>", normalizedContent);
        Assert.Contains("<strong>safe text</strong>", normalizedContent);
        Assert.Contains("href=\"https://example.com\"", normalizedContent);
        Assert.DoesNotContain("<script", normalizedContent);
        Assert.DoesNotContain("<img", normalizedContent);
        Assert.DoesNotContain("onclick", normalizedContent);
        Assert.DoesNotContain("onerror", normalizedContent);
        Assert.DoesNotContain("javascript:", normalizedContent);
    }

    [Fact]
    public async Task DeleteBlog_WhenBlogDoesNotExist_ReturnsNotFound()
    {
        using var client = await CreateAdminClientAsync();

        var response = await client.DeleteAsync($"/api/admin/blogs/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanUploadOneFeaturedImageAndBlogDeletionRemovesIt()
    {
        var storage = new FakeImageStorage();
        using var imageFactory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IImageStorage>();
                services.AddSingleton<IImageStorage>(storage);
            }));
        using var client = imageFactory.CreateClient();
        var email = $"blog-image-admin-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(imageFactory.Services, email, RoleNames.Admin);
        await LoginAsync(client, email);

        var createResponse = await client.PostAsJsonAsync(
            "/api/admin/blogs",
            CreateRequest($"Image blog {Guid.NewGuid():N}"));
        createResponse.EnsureSuccessStatusCode();
        var blog = await createResponse.Content.ReadFromJsonAsync<BlogResponse>();
        Assert.NotNull(blog);

        using var imageContent = new ByteArrayContent(
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        imageContent.Headers.ContentType = new("image/png");
        var uploadResponse = await client.PostAsync(
            $"/api/admin/blogs/{blog.Id}/featured-image",
            imageContent);

        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);
        var updated = await uploadResponse.Content.ReadFromJsonAsync<BlogResponse>();
        Assert.NotNull(updated);
        Assert.StartsWith("https://images.example.com/blogs/", updated.FeaturedImageUrl);
        var objectKey = Assert.Single(storage.UploadedKeys);

        var deleteResponse = await client.DeleteAsync($"/api/admin/blogs/{blog.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.Contains(objectKey, storage.DeletedKeys);
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
        await CreateUserAsync(factory.Services, email, role);
    }

    private static async Task CreateUserAsync(IServiceProvider services, string email, string role)
    {
        await using var scope = services.CreateAsyncScope();
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
            isPublished
        };

    private sealed record BlogResponse(
        Guid Id,
        string Title,
        string Slug,
        string Content,
        string? FeaturedImageUrl,
        bool IsPublished,
        DateTimeOffset? PublishedAt);

    private sealed record BlogListResponse(
        int Page,
        int PageSize,
        int TotalCount,
        IReadOnlyList<BlogResponse> Items);

    private sealed class FakeImageStorage : IImageStorage
    {
        public bool IsConfigured => true;

        public List<string> UploadedKeys { get; } = [];

        public List<string> DeletedKeys { get; } = [];

        public string GetPublicUrl(string objectKey) =>
            $"https://images.example.com/{objectKey}";

        public Task UploadAsync(
            string objectKey,
            Stream content,
            string contentType,
            CancellationToken cancellationToken)
        {
            UploadedKeys.Add(objectKey);
            return Task.CompletedTask;
        }

        public Task DeleteAsync(string objectKey, CancellationToken cancellationToken)
        {
            DeletedKeys.Add(objectKey);
            return Task.CompletedTask;
        }
    }
}
