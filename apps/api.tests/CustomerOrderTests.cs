using System.Net;
using System.Net.Http.Json;
using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MawridTravel.Api.Tests;

public sealed class CustomerOrderTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task MyOrders_WhenAuthenticated_ReturnsOnlyCurrentCustomersOrders()
    {
        using var client = factory.CreateClient();
        var customerEmail = $"orders-customer-{Guid.NewGuid():N}@example.com";
        var otherEmail = $"orders-other-{Guid.NewGuid():N}@example.com";
        var customerId = await CreateCustomerAsync(customerEmail);
        var otherCustomerId = await CreateCustomerAsync(otherEmail);
        var ownOrderNumber = $"MT-{Guid.NewGuid():N}";
        var otherOrderNumber = $"MT-{Guid.NewGuid():N}";

        await SeedOrderAsync(customerId, ownOrderNumber);
        await SeedOrderAsync(otherCustomerId, otherOrderNumber);
        await LoginAsync(client, customerEmail);

        var response = await client.GetAsync("/api/orders?page=1&pageSize=20");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<OrderListResponse>();
        Assert.NotNull(body);
        Assert.Contains(body.Items, order => order.OrderNumber == ownOrderNumber);
        Assert.DoesNotContain(body.Items, order => order.OrderNumber == otherOrderNumber);
    }

    [Fact]
    public async Task MyOrders_WhenAnonymous_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/orders");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task<Guid> CreateCustomerAsync(string email)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var now = DateTimeOffset.UtcNow;
        var user = new ApplicationUser
        {
            FirstName = "Order",
            LastName = "Customer",
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        Assert.True((await userManager.CreateAsync(user, "Travel123")).Succeeded);
        Assert.True((await userManager.AddToRoleAsync(user, RoleNames.Customer)).Succeeded);
        return user.Id;
    }

    private async Task SeedOrderAsync(Guid customerId, string orderNumber)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;
        dbContext.Orders.Add(new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            RequestFingerprint = Guid.NewGuid().ToString(),
            OrderNumber = orderNumber,
            FullName = "Order Customer",
            Phone = "01700000000",
            Address = "Dhaka, Bangladesh",
            DeliveryArea = "InsideDhaka",
            PaymentMethod = "CashOnDelivery",
            Status = "Confirmed",
            Currency = "BDT",
            Subtotal = 1000,
            DeliveryFee = 80,
            Total = 1080,
            CreatedAt = now,
            UpdatedAt = now
        });
        await dbContext.SaveChangesAsync();
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

    private sealed record OrderListResponse(
        int Page,
        int PageSize,
        int TotalCount,
        IReadOnlyList<OrderResponse> Items);

    private sealed record OrderResponse(Guid Id, string OrderNumber);
}
