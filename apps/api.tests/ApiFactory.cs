using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;

namespace MawridTravel.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string AllowedOrigin = "http://localhost:4200";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.UseSetting(
            "ConnectionStrings:DefaultConnection",
            "Host=localhost;Database=mawrid_tests;Username=tests;Password=tests");
        builder.UseSetting("Cors:AllowedOrigins:0", AllowedOrigin);
    }
}
