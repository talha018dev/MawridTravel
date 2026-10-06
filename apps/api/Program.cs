using MawridTravel.Api.Common.Exceptions;
using MawridTravel.Api.Features.Admin;
using MawridTravel.Api.Features.Auth;
using MawridTravel.Api.Features.Health;
using MawridTravel.Api.Features.Products;
using MawridTravel.Api.Infrastructure.Authentication;
using MawridTravel.Api.Infrastructure.Persistence;
using MawridTravel.Api.Infrastructure.Storage;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddPersistence(builder.Configuration);
builder.Services.AddProductImageStorage();
builder.Services.AddApplicationIdentity(builder.Environment);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];

        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

if (args.Contains("--migrate", StringComparer.OrdinalIgnoreCase))
{
    await app.Services.MigrateDatabaseAsync();
    return;
}

await app.Services.SeedIdentityAsync();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
        options.WithTitle("Mawrid Travel API"));
}

app.MapHealthEndpoints();
app.MapAuthEndpoints();
app.MapAdminEndpoints();
app.MapProductEndpoints();

app.Run();

public partial class Program;
