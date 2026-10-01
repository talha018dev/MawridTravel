using MawridTravel.Api.Features.Auth.Login;
using MawridTravel.Api.Features.Auth.Register;

namespace MawridTravel.Api.Features.Auth;

internal static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Authentication");

        group.MapRegisterEndpoint();
        group.MapLoginEndpoint();

        return endpoints;
    }
}
