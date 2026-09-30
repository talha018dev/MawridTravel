using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

namespace MawridTravel.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string AllowedOrigin = "http://localhost:4200";
    private readonly string _databaseName = $"mawrid-tests-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.UseSetting(
            "ConnectionStrings:DefaultConnection",
            "Host=localhost;Database=mawrid_tests;Username=tests;Password=tests");
        builder.UseSetting("Cors:AllowedOrigins:0", AllowedOrigin);
        builder.ConfigureTestServices(services =>
        {
            var inMemoryProvider = new ServiceCollection()
                .AddEntityFrameworkInMemoryDatabase()
                .BuildServiceProvider();

            services.RemoveAll<AppDbContext>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options
                    .UseInMemoryDatabase(_databaseName)
                    .UseInternalServiceProvider(inMemoryProvider));
        });
    }
}
