using MawridTravel.Api.Common.Exceptions;
using MawridTravel.Api.Features.Health;
using MawridTravel.Api.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddPersistence(builder.Configuration);

var app = builder.Build();

app.UseExceptionHandler();
app.MapHealthEndpoints();

app.Run();

public partial class Program;
