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

        await SeedAdminAsync(scope.ServiceProvider);
    }

    private static async Task SeedAdminAsync(IServiceProvider services)
    {
        var configuration = services.GetRequiredService<IConfiguration>();
        var options = configuration
            .GetSection(AdminSeedOptions.SectionName)
            .Get<AdminSeedOptions>() ?? new AdminSeedOptions();

        if (!options.Enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(options.Email) ||
            string.IsNullOrWhiteSpace(options.Password))
        {
            throw new InvalidOperationException(
                "Admin seeding is enabled, but AdminSeed:Email or " +
                "AdminSeed:Password is missing.");
        }

        if (string.IsNullOrWhiteSpace(options.FirstName) ||
            string.IsNullOrWhiteSpace(options.LastName))
        {
            throw new InvalidOperationException(
                "AdminSeed:FirstName and AdminSeed:LastName are required.");
        }

        var userManager = services
            .GetRequiredService<UserManager<ApplicationUser>>();
        var email = options.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);

        if (user is null)
        {
            var now = services
                .GetRequiredService<TimeProvider>()
                .GetUtcNow();
            user = new ApplicationUser
            {
                FirstName = options.FirstName.Trim(),
                LastName = options.LastName.Trim(),
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            EnsureSucceeded(
                await userManager.CreateAsync(user, options.Password),
                "create the configured Admin user");
        }

        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            EnsureSucceeded(
                await userManager.UpdateAsync(user),
                "confirm the configured Admin user's email");
        }

        if (!await userManager.IsInRoleAsync(user, RoleNames.Admin))
        {
            EnsureSucceeded(
                await userManager.AddToRoleAsync(user, RoleNames.Admin),
                "assign the Admin role to the configured user");
        }
    }

    private static void EnsureSucceeded(IdentityResult result, string action)
    {
        if (result.Succeeded)
        {
            return;
        }

        var errors = string.Join(
            "; ",
            result.Errors.Select(error => error.Description));

        throw new InvalidOperationException(
            $"Could not {action}: {errors}");
    }
}
