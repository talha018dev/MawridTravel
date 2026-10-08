using System.Net;
using System.Net.Http.Json;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MawridTravel.Api.Tests;

public sealed class OrderTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Checkout_WithValidCodOrder_CreatesOrderAndReservesStock()
    {
        var product = await CreateProductAsync(stockQuantity: 3);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());

        var response = await client.PostAsJsonAsync("/api/checkout", new
        {
            fullName = "Test Customer",
            phone = "01700000000",
            email = (string?)null,
            address = "1 Test Road, Dhaka",
            paymentMethod = "CashOnDelivery",
            items = new[]
            {
                new
                {
                    productId = product.ProductId,
                    colorOptionValueId = product.ColorId,
                    sizeOptionValueId = product.SizeId,
                    quantity = 2
                }
            }
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
        Assert.Equal("NotConfirmed", order.Status);
        Assert.Equal(200m, order.Subtotal);
        Assert.Equal(80m, order.DeliveryFee);
        Assert.Equal(280m, order.Total);

        await using var scope = factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await dbContext.Products
            .Where(item => item.Id == product.ProductId)
            .Select(item => item.StockQuantity)
            .SingleAsync());
    }

    [Fact]
    public async Task Admin_CanMoveOrderThroughFulfilmentStatuses()
    {
        var product = await CreateProductAsync(stockQuantity: 2);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var checkout = await client.PostAsJsonAsync("/api/checkout", new
        {
            fullName = "Status Customer",
            phone = "01800000000",
            address = "2 Test Road, Dhaka",
            paymentMethod = "CashOnDelivery",
            items = new[]
            {
                new
                {
                    productId = product.ProductId,
                    colorOptionValueId = product.ColorId,
                    sizeOptionValueId = product.SizeId,
                    quantity = 1
                }
            }
        });
        checkout.EnsureSuccessStatusCode();
        var order = await checkout.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);

        await CreateAdminAndLoginAsync(client);
        foreach (var status in new[] { "Confirmed", "InProgress", "Completed" })
        {
            var response = await client.PatchAsJsonAsync(
                $"/api/admin/orders/{order.Id}/status",
                new { status });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.Content.ReadFromJsonAsync<OrderResponse>();
            Assert.Equal(status, updated?.Status);
        }
    }

    [Fact]
    public async Task Checkout_WithoutRequiredCustomerDetails_ReturnsValidationProblem()
    {
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/checkout", new
        {
            fullName = "",
            phone = "",
            address = "",
            paymentMethod = "CashOnDelivery",
            items = Array.Empty<object>()
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Checkout_WithSameIdempotencyKey_ReturnsOriginalOrderOnlyOnce()
    {
        var product = await CreateProductAsync(stockQuantity: 3);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var request = new
        {
            fullName = "Retry Customer",
            phone = "01900000000",
            address = "3 Test Road, Dhaka",
            paymentMethod = "CashOnDelivery",
            items = new[]
            {
                new
                {
                    productId = product.ProductId,
                    colorOptionValueId = product.ColorId,
                    sizeOptionValueId = product.SizeId,
                    quantity = 1
                }
            }
        };

        var firstResponse = await client.PostAsJsonAsync("/api/checkout", request);
        var secondResponse = await client.PostAsJsonAsync("/api/checkout", request);
        firstResponse.EnsureSuccessStatusCode();
        secondResponse.EnsureSuccessStatusCode();
        var firstOrder = await firstResponse.Content.ReadFromJsonAsync<OrderResponse>();
        var secondOrder = await secondResponse.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.Equal(firstOrder?.Id, secondOrder?.Id);

        await using var scope = factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await dbContext.Orders.CountAsync(order => order.Id == firstOrder!.Id));
        Assert.Equal(2, await dbContext.Products
            .Where(item => item.Id == product.ProductId)
            .Select(item => item.StockQuantity)
            .SingleAsync());
    }

    private async Task<(Guid ProductId, Guid ColorId, Guid SizeId)> CreateProductAsync(int stockQuantity)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var color = new ProductOptionValue { Id = Guid.NewGuid(), Value = "Black", ColorHex = "#000000", SortOrder = 0 };
        var size = new ProductOptionValue { Id = Guid.NewGuid(), Value = "Medium", SortOrder = 0 };
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = $"Checkout product {Guid.NewGuid():N}",
            Slug = $"checkout-product-{Guid.NewGuid():N}",
            Price = 100m,
            Currency = "BDT",
            StockQuantity = stockQuantity,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Options =
            [
                new ProductOption { Name = "Color", SortOrder = 0, Values = [color] },
                new ProductOption { Name = "Size", SortOrder = 1, Values = [size] }
            ]
        };
        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync();
        return (product.Id, color.Id, size.Id);
    }

    private async Task CreateAdminAndLoginAsync(HttpClient client)
    {
        var email = $"order-admin-{Guid.NewGuid():N}@example.com";
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = new ApplicationUser
        {
            FirstName = "Order",
            LastName = "Admin",
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        Assert.True((await userManager.CreateAsync(user, "Travel123")).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(user, RoleNames.Admin)).Succeeded);
        var login = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "Travel123",
            rememberMe = false
        });
        login.EnsureSuccessStatusCode();
    }

    private sealed record OrderResponse(
        Guid Id,
        string OrderNumber,
        string Status,
        decimal Subtotal,
        decimal DeliveryFee,
        decimal Total);
}
