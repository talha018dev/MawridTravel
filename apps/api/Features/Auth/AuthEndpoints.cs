using MawridTravel.Api.Features.Auth.Login;
using MawridTravel.Api.Features.Auth.Logout;
using MawridTravel.Api.Features.Auth.Me;
using MawridTravel.Api.Features.Auth.Register;
using MawridTravel.Api.Features.Auth.ResendOtp;
using MawridTravel.Api.Features.Auth.VerifyOtp;

namespace MawridTravel.Api.Features.Auth;

internal static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Authentication");

        group.MapRegisterEndpoint();
        group.MapVerifyOtpEndpoint();
        group.MapResendOtpEndpoint();
        group.MapLoginEndpoint();
        group.MapMeEndpoint();
        group.MapLogoutEndpoint();

        return endpoints;
    }
}
