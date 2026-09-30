using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Infrastructure.Persistence;

internal static class PersistenceExtensions
{
    public static IServiceCollection AddPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["DATABASE_CONNECTION_STRING"];

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "A PostgreSQL connection string is required. Configure " +
                "ConnectionStrings:DefaultConnection or DATABASE_CONNECTION_STRING.");
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString, npgsqlOptions =>
                npgsqlOptions.EnableRetryOnFailure()));

        return services;
    }
}
