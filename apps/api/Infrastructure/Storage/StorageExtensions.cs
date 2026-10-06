namespace MawridTravel.Api.Infrastructure.Storage;

internal static class StorageExtensions
{
    public static IServiceCollection AddProductImageStorage(
        this IServiceCollection services)
    {
        services.AddSingleton<IProductImageStorage, R2ProductImageStorage>();
        return services;
    }
}
