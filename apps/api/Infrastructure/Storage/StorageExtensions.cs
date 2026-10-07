namespace MawridTravel.Api.Infrastructure.Storage;

internal static class StorageExtensions
{
    public static IServiceCollection AddImageStorage(
        this IServiceCollection services)
    {
        services.AddSingleton<IImageStorage, R2ImageStorage>();
        return services;
    }
}
