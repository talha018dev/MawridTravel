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

public sealed class ProductTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task CreateProduct_WhenAnonymous_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest("Anonymous product"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateProduct_WhenCustomer_ReturnsForbidden()
    {
        using var client = factory.CreateClient();
        var email = $"product-customer-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(email, RoleNames.Customer);
        await LoginAsync(client, email);

        var response = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest("Customer product"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteProduct_WhenAnonymous_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/api/admin/products/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteProduct_WhenCustomer_ReturnsForbidden()
    {
        using var client = factory.CreateClient();
        var email = $"product-delete-customer-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(email, RoleNames.Customer);
        await LoginAsync(client, email);

        var response = await client.DeleteAsync($"/api/admin/products/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteProduct_WhenProductDoesNotExist_ReturnsNotFound()
    {
        using var client = await CreateAdminClientAsync();

        var response = await client.DeleteAsync($"/api/admin/products/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanCreateUpdateAndDeleteProduct()
    {
        using var client = await CreateAdminClientAsync();
        var suffix = Guid.NewGuid().ToString("N");
        var createResponse = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest(
                "Premium Travel Bag",
                sku: $"bag-{suffix}",
                price: 129.99m,
                compareAtPrice: 149.99m,
                isActive: true));

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(created);
        Assert.Equal("premium-travel-bag", created.Slug);
        Assert.Equal($"BAG-{suffix.ToUpperInvariant()}", created.Sku);
        Assert.Equal("BDT", created.Currency);

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/admin/products/{created.Id}",
            CreateRequest(
                "Premium Travel Bag",
                slug: "carry-on-bag",
                sku: created.Sku,
                price: 119.99m,
                compareAtPrice: 149.99m,
                stockQuantity: 7,
                isActive: true));

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(updated);
        Assert.Equal("carry-on-bag", updated.Slug);
        Assert.Equal(119.99m, updated.Price);
        Assert.Equal(7, updated.StockQuantity);

        var publicResponse = await client.GetAsync("/api/products/carry-on-bag");
        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);

        var deleteResponse = await client.DeleteAsync($"/api/admin/products/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var deletedResponse = await client.GetAsync("/api/products/carry-on-bag");
        Assert.Equal(HttpStatusCode.NotFound, deletedResponse.StatusCode);
    }

    [Fact]
    public async Task PublicProductEndpoint_DoesNotExposeInactiveProduct()
    {
        using var client = await CreateAdminClientAsync();
        var name = $"Draft Product {Guid.NewGuid():N}";
        var createResponse = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest(name, isActive: false));
        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        var response = await client.GetAsync($"/api/products/{product.Slug}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateProduct_WithDuplicateSku_ReturnsValidationProblem()
    {
        using var client = await CreateAdminClientAsync();
        var sku = $"DUP-{Guid.NewGuid():N}";
        var firstResponse = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest("First product", sku: sku));
        firstResponse.EnsureSuccessStatusCode();

        var duplicateResponse = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest("Second product", sku: sku.ToLowerInvariant()));

        Assert.Equal(HttpStatusCode.BadRequest, duplicateResponse.StatusCode);
        Assert.Equal(
            "application/problem+json",
            duplicateResponse.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task CreateProduct_AllowsCompareAtPriceBelowPrice()
    {
        using var client = await CreateAdminClientAsync();

        var response = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest(
                $"Lower comparison {Guid.NewGuid():N}",
                price: 150m,
                compareAtPrice: 100m));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var product = await response.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);
        Assert.Equal(150m, product.Price);
        Assert.Equal(100m, product.CompareAtPrice);
    }

    [Fact]
    public async Task Admin_CanUploadAndDeleteProductImage()
    {
        var storage = new FakeProductImageStorage();
        using var imageFactory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IImageStorage>();
                services.AddSingleton<IImageStorage>(storage);
            }));
        using var client = imageFactory.CreateClient();
        var email = $"image-admin-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(imageFactory.Services, email, RoleNames.Admin);
        await LoginAsync(client, email);
        var createResponse = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest("Product with image"));
        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        var pngHeader = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        using var imageContent = new ByteArrayContent(pngHeader);
        imageContent.Headers.ContentType = new("image/png");
        var uploadResponse = await client.PostAsync(
            $"/api/admin/products/{product.Id}/images?altText=Travel%20bag&isPrimary=true",
            imageContent);

        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);
        var image = await uploadResponse.Content.ReadFromJsonAsync<ProductImageResponse>();
        Assert.NotNull(image);
        Assert.True(image.IsPrimary);
        Assert.Equal("Travel bag", image.AltText);
        Assert.StartsWith("https://images.example.com/products/", image.Url);
        Assert.Single(storage.UploadedKeys);

        var deleteResponse = await client.DeleteAsync(
            $"/api/admin/products/{product.Id}/images/{image.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.Single(storage.DeletedKeys);
        Assert.Equal(storage.UploadedKeys[0], storage.DeletedKeys[0]);
    }

    [Fact]
    public async Task Admin_CanDeleteProductAndItsStoredImages()
    {
        var storage = new FakeProductImageStorage();
        using var imageFactory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IImageStorage>();
                services.AddSingleton<IImageStorage>(storage);
            }));
        using var client = imageFactory.CreateClient();
        var email = $"product-delete-admin-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(imageFactory.Services, email, RoleNames.Admin);
        await LoginAsync(client, email);
        var createResponse = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest($"Product to delete {Guid.NewGuid():N}"));
        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        var pngHeader = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        using var imageContent = new ByteArrayContent(pngHeader);
        imageContent.Headers.ContentType = new("image/png");
        var uploadResponse = await client.PostAsync(
            $"/api/admin/products/{product.Id}/images?isPrimary=true",
            imageContent);
        uploadResponse.EnsureSuccessStatusCode();
        Assert.Single(storage.UploadedKeys);

        var deleteResponse = await client.DeleteAsync($"/api/admin/products/{product.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.Equal(storage.UploadedKeys, storage.DeletedKeys);
        var getDeletedResponse = await client.GetAsync($"/api/admin/products/{product.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getDeletedResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteProduct_WhenImageStorageIsUnavailable_KeepsProduct()
    {
        var storage = new FakeProductImageStorage();
        using var imageFactory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IImageStorage>();
                services.AddSingleton<IImageStorage>(storage);
            }));
        using var client = imageFactory.CreateClient();
        var email = $"product-storage-admin-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(imageFactory.Services, email, RoleNames.Admin);
        await LoginAsync(client, email);
        var createResponse = await client.PostAsJsonAsync(
            "/api/admin/products",
            CreateRequest($"Product retained {Guid.NewGuid():N}"));
        createResponse.EnsureSuccessStatusCode();
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);

        var pngHeader = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        using var imageContent = new ByteArrayContent(pngHeader);
        imageContent.Headers.ContentType = new("image/png");
        var uploadResponse = await client.PostAsync(
            $"/api/admin/products/{product.Id}/images",
            imageContent);
        uploadResponse.EnsureSuccessStatusCode();
        storage.IsConfigured = false;

        var deleteResponse = await client.DeleteAsync($"/api/admin/products/{product.Id}");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, deleteResponse.StatusCode);
        Assert.Empty(storage.DeletedKeys);
        var retainedResponse = await client.GetAsync($"/api/admin/products/{product.Id}");
        Assert.Equal(HttpStatusCode.OK, retainedResponse.StatusCode);
    }

    private async Task<HttpClient> CreateAdminClientAsync()
    {
        var client = factory.CreateClient();
        var email = $"product-admin-{Guid.NewGuid():N}@example.com";
        await CreateUserAsync(email, RoleNames.Admin);
        await LoginAsync(client, email);
        return client;
    }

    private async Task CreateUserAsync(string email, string role)
    {
        await CreateUserAsync(factory.Services, email, role);
    }

    private static async Task CreateUserAsync(
        IServiceProvider services,
        string email,
        string role)
    {
        await using var scope = services.CreateAsyncScope();
        var userManager = scope.ServiceProvider
            .GetRequiredService<UserManager<ApplicationUser>>();
        var now = DateTimeOffset.UtcNow;
        var user = new ApplicationUser
        {
            FirstName = "Product",
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
        string name,
        string? slug = null,
        string? sku = null,
        decimal price = 100,
        decimal? compareAtPrice = null,
        int stockQuantity = 5,
        bool isActive = true) => new
        {
            name,
            slug,
            description = "A product used by the API integration tests.",
            sku,
            price,
            compareAtPrice,
            currency = "bdt",
            stockQuantity,
            isActive
        };

    private sealed record ProductResponse(
        Guid Id,
        string Name,
        string Slug,
        string? Sku,
        decimal Price,
        decimal? CompareAtPrice,
        string Currency,
        int StockQuantity,
        bool IsActive,
        IReadOnlyList<ProductImageResponse> Images);

    private sealed record ProductImageResponse(
        Guid Id,
        string Url,
        string ContentType,
        string? AltText,
        int SortOrder,
        bool IsPrimary);

    private sealed class FakeProductImageStorage : IImageStorage
    {
        public bool IsConfigured { get; set; } = true;

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

        public Task DeleteAsync(
            string objectKey,
            CancellationToken cancellationToken)
        {
            DeletedKeys.Add(objectKey);
            return Task.CompletedTask;
        }
    }
}
