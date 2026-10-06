using MawridTravel.Api.Features.Admin.Products.Images;

namespace MawridTravel.Api.Features.Admin.Products;

internal static class AdminProductEndpoints
{
    public static RouteGroupBuilder MapAdminProductEndpoints(this RouteGroupBuilder adminGroup)
    {
        var group = adminGroup.MapGroup("/products");

        group.MapGet("/", ProductHandlers.GetProductsAsync)
            .WithName("GetAdminProducts");
        group.MapGet("/{id:guid}", ProductHandlers.GetProductAsync)
            .WithName("GetAdminProduct");
        group.MapPost("/", ProductHandlers.CreateProductAsync)
            .WithName("CreateProduct");
        group.MapPut("/{id:guid}", ProductHandlers.UpdateProductAsync)
            .WithName("UpdateProduct");
        group.MapDelete("/{id:guid}", ProductHandlers.DeleteProductAsync)
            .WithName("DeleteProduct");

        group.MapProductImageEndpoints();

        return adminGroup;
    }
}
