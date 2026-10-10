using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace MawridTravel.Api.Features.Orders;

internal static class OrderEndpoints
{
    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/checkout", CheckoutAsync)
            .WithTags("Checkout")
            .WithName("Checkout")
            .Produces<OrderResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        endpoints.MapGet("/api/orders", GetMyOrdersAsync)
            .WithTags("Orders")
            .WithName("GetMyOrders")
            .RequireAuthorization()
            .Produces<OrderListResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return endpoints;
    }

    private static async Task<IResult> GetMyOrdersAsync(
        ClaimsPrincipal principal,
        AppDbContext dbContext,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
            return Results.Unauthorized();

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var query = dbContext.Orders.AsNoTracking().Where(order => order.CustomerId == customerId);
        var totalCount = await query.CountAsync(cancellationToken);
        var orders = await query
            .Include(order => order.Items)
            .OrderByDescending(order => order.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Results.Ok(new OrderListResponse(
            page,
            pageSize,
            totalCount,
            orders.Select(order => order.ToResponse()).ToArray()));
    }

    private static async Task<IResult> CheckoutAsync(
        CheckoutRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        AppDbContext dbContext,
        TimeProvider timeProvider,
        ClaimsPrincipal principal,
        CancellationToken cancellationToken)
    {
        var errors = ValidateRequest(request);
        if (!Guid.TryParse(idempotencyKey, out var parsedIdempotencyKey))
            errors["idempotencyKey"] = ["A valid Idempotency-Key header is required."];
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        var normalizedIdempotencyKey = parsedIdempotencyKey.ToString("D");
        var requestFingerprint = CreateFingerprint(request);
        var existingOrder = await dbContext.Orders
            .AsNoTracking()
            .Include(order => order.Items)
            .SingleOrDefaultAsync(
                order => order.IdempotencyKey == normalizedIdempotencyKey,
                cancellationToken);
        if (existingOrder is not null)
            return ExistingOrderResult(existingOrder, requestFingerprint);

        var requestedItems = request.Items!
            .GroupBy(item => new
            {
                item.ProductId,
                item.ColorOptionValueId,
                item.SizeOptionValueId
            })
            .Select(group => new CheckoutItemRequest(
                group.Key.ProductId,
                group.Key.ColorOptionValueId,
                group.Key.SizeOptionValueId,
                group.Sum(item => item.Quantity)))
            .ToArray();
        var productIds = requestedItems.Select(item => item.ProductId).Distinct().ToArray();
        var products = await dbContext.Products
            .Include(product => product.Options)
            .ThenInclude(option => option.Values)
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, cancellationToken);

        var orderItems = new List<OrderItem>();
        for (var index = 0; index < requestedItems.Length; index++)
        {
            var requestedItem = requestedItems[index];
            if (!products.TryGetValue(requestedItem.ProductId, out var product) || !product.IsActive)
            {
                errors[$"items[{index}].productId"] = ["This product is unavailable."];
                continue;
            }

            if (!string.Equals(product.Currency, "BDT", StringComparison.OrdinalIgnoreCase))
            {
                errors[$"items[{index}].productId"] = ["Cash on delivery currently supports BDT products only."];
            }

            var color = FindOptionValue(product, "Color", requestedItem.ColorOptionValueId);
            var size = FindOptionValue(product, "Size", requestedItem.SizeOptionValueId);
            if (color is null)
            {
                errors[$"items[{index}].colorOptionValueId"] = ["Select a valid product color."];
            }
            if (size is null)
            {
                errors[$"items[{index}].sizeOptionValueId"] = ["Select a valid product size."];
            }
            if (requestedItem.Quantity > product.StockQuantity)
            {
                errors[$"items[{index}].quantity"] =
                    [$"Only {product.StockQuantity} item(s) are currently available."];
            }

            if (color is null || size is null) continue;
            orderItems.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                ProductName = product.Name,
                ProductSlug = product.Slug,
                ColorOptionValueId = color.Id,
                Color = color.Value,
                ColorHex = color.ColorHex,
                SizeOptionValueId = size.Id,
                Size = size.Value,
                UnitPrice = product.Price,
                Quantity = requestedItem.Quantity,
                LineTotal = product.Price * requestedItem.Quantity
            });
        }

        if (errors.Count > 0) return Results.ValidationProblem(errors);

        foreach (var productGroup in requestedItems.GroupBy(item => item.ProductId))
        {
            var requestedQuantity = productGroup.Sum(item => item.Quantity);
            var product = products[productGroup.Key];
            if (!product.IsActive || product.StockQuantity < requestedQuantity)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["items"] = ["One or more products no longer have enough stock. Refresh your cart and try again."]
                });
            }
            product.StockQuantity -= requestedQuantity;
            product.UpdatedAt = timeProvider.GetUtcNow();
        }

        var now = timeProvider.GetUtcNow();
        var subtotal = orderItems.Sum(item => item.LineTotal);
        var deliveryFee = OrderConstants.GetDeliveryFee(request.DeliveryArea!);
        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = TryGetCustomerId(principal),
            IdempotencyKey = normalizedIdempotencyKey,
            RequestFingerprint = requestFingerprint,
            OrderNumber = $"MWR-{now:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant(),
            FullName = request.FullName!.Trim(),
            Phone = request.Phone!.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Address = request.Address!.Trim(),
            DeliveryArea = request.DeliveryArea!,
            PaymentMethod = request.PaymentMethod == OrderConstants.BanglaQr
                ? OrderConstants.UnpaidBanglaQr
                : OrderConstants.CashOnDelivery,
            Status = OrderConstants.Statuses.NotConfirmed,
            Currency = "BDT",
            Subtotal = subtotal,
            DeliveryFee = deliveryFee,
            Total = subtotal + deliveryFee,
            CreatedAt = now,
            UpdatedAt = now,
            Items = orderItems
        };

        dbContext.Orders.Add(order);
        try
        {
            var executionStrategy = dbContext.Database.CreateExecutionStrategy();
            await executionStrategy.ExecuteAsync(async () =>
            {
                await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
                if (dbContext.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
                {
                    await dbContext.Database.ExecuteSqlRawAsync(
                        "SET LOCAL lock_timeout = '5s'",
                        cancellationToken);
                }

                await dbContext.SaveChangesAsync(acceptAllChangesOnSuccess: false, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            });
            dbContext.ChangeTracker.AcceptAllChanges();
        }
        catch (DbUpdateConcurrencyException)
        {
            dbContext.ChangeTracker.Clear();
            existingOrder = await dbContext.Orders
                .AsNoTracking()
                .Include(item => item.Items)
                .SingleOrDefaultAsync(
                    item => item.IdempotencyKey == normalizedIdempotencyKey,
                    cancellationToken);
            if (existingOrder is not null)
                return ExistingOrderResult(existingOrder, requestFingerprint);
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["items"] = ["One or more products no longer have enough stock. Refresh your cart and try again."]
            });
        }
        catch (DbUpdateException exception)
        {
            dbContext.ChangeTracker.Clear();
            existingOrder = await dbContext.Orders
                .AsNoTracking()
                .Include(item => item.Items)
                .SingleOrDefaultAsync(
                    item => item.IdempotencyKey == normalizedIdempotencyKey,
                    cancellationToken);
            if (existingOrder is not null)
                return ExistingOrderResult(existingOrder, requestFingerprint);
            if (exception.InnerException is PostgresException
                {
                    SqlState: PostgresErrorCodes.LockNotAvailable
                })
                return Results.Problem(
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "Checkout is temporarily busy.",
                    detail: "Another checkout is updating the same product. Please try again.");
            throw;
        }

        return Results.Created($"/api/orders/{order.OrderNumber}", order.ToResponse());
    }

    private static IResult ExistingOrderResult(Order order, string requestFingerprint) =>
        order.RequestFingerprint == requestFingerprint
            ? Results.Ok(order.ToResponse())
            : Results.Conflict(new
            {
                title = "Idempotency key has already been used.",
                detail = "Generate a new idempotency key before submitting different checkout data."
            });

    private static Guid? TryGetCustomerId(ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId)
            ? customerId
            : null;

    private static string CreateFingerprint(CheckoutRequest request)
    {
        var canonicalRequest = new
        {
            FullName = request.FullName?.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim().ToLowerInvariant(),
            Address = request.Address?.Trim(),
            DeliveryArea = request.DeliveryArea,
            PaymentMethod = request.PaymentMethod,
            Items = request.Items?
                .OrderBy(item => item.ProductId)
                .ThenBy(item => item.ColorOptionValueId)
                .ThenBy(item => item.SizeOptionValueId)
                .Select(item => new
                {
                    item.ProductId,
                    item.ColorOptionValueId,
                    item.SizeOptionValueId,
                    item.Quantity
                })
        };
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(canonicalRequest));
        return Convert.ToHexString(SHA256.HashData(bytes));
    }

    private static ProductOptionValue? FindOptionValue(
        Product product,
        string optionName,
        Guid valueId) =>
        product.Options
            .FirstOrDefault(option => string.Equals(
                option.Name,
                optionName,
                StringComparison.OrdinalIgnoreCase))?
            .Values.FirstOrDefault(value => value.Id == valueId);

    private static Dictionary<string, string[]> ValidateRequest(CheckoutRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length > 200)
            errors["fullName"] = ["Full name is required and must not exceed 200 characters."];

        if (string.IsNullOrWhiteSpace(request.Phone) || request.Phone.Trim().Length > 30)
            errors["phone"] = ["Phone is required and must not exceed 30 characters."];

        if (string.IsNullOrWhiteSpace(request.Address) || request.Address.Trim().Length > 1_000)
            errors["address"] = ["Address is required and must not exceed 1,000 characters."];

        if (request.DeliveryArea is not (OrderConstants.InsideDhaka or OrderConstants.OutsideDhaka))
            errors["deliveryArea"] = ["Select whether the delivery address is inside or outside Dhaka."];

        if (!string.IsNullOrWhiteSpace(request.Email) &&
            (request.Email.Trim().Length > 320 || !MailAddress.TryCreate(request.Email.Trim(), out _)))
            errors["email"] = ["Enter a valid email address."];

        if (request.PaymentMethod is not (OrderConstants.CashOnDelivery or OrderConstants.BanglaQr))
            errors["paymentMethod"] = ["Select cash on delivery or Bangla QR."];
            
        if (request.Items is null || request.Items.Count == 0)
            errors["items"] = ["Your cart is empty."];
        else if (request.Items.Count > 50)
            errors["items"] = ["An order cannot contain more than 50 cart lines."];
        else
        {
            for (var index = 0; index < request.Items.Count; index++)
            {
                if (request.Items[index].Quantity is < 1 or > 99)
                    errors[$"items[{index}].quantity"] = ["Quantity must be between 1 and 99."];
            }
        }

        return errors;
    }
}
