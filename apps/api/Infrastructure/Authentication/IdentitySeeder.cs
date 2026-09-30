using MawridTravel.Api.Domain.Authorization;
using MawridTravel.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace MawridTravel.Api.Infrastructure.Authentication;

internal static class IdentitySeeder
{
    private static readonly string[] Roles =
    [
        RoleNames.Admin,
        RoleNames.Customer
    ];

    public static async Task SeedIdentityAsync(this IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var roleManager = scope.ServiceProvider
            .GetRequiredService<RoleManager<ApplicationRole>>();

        foreach (var roleName in Roles)
        {
            if (await roleManager.RoleExistsAsync(roleName))
            {
                continue;
            }

            var result = await roleManager.CreateAsync(new ApplicationRole
            {
                Name = roleName
            });

            if (!result.Succeeded)
            {
                var errors = string.Join(
                    "; ",
                    result.Errors.Select(error => error.Description));

                throw new InvalidOperationException(
                    $"Could not create the '{roleName}' role: {errors}");
            }
        }
    }
}
