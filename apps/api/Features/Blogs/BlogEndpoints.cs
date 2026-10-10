using MawridTravel.Api.Infrastructure.Persistence;
using MawridTravel.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Blogs;

internal static class BlogEndpoints
{
    public static IEndpointRouteBuilder MapBlogEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/blogs").WithTags("Blogs");

        group.MapGet("/", GetBlogsAsync).WithName("GetPublishedBlogs");
        group.MapGet("/{slug}", GetBlogAsync).WithName("GetPublishedBlog");

        return endpoints;
    }

    private static async Task<IResult> GetBlogsAsync(
        AppDbContext dbContext,
        IImageStorage imageStorage,
        string? search,
        int page = 1,
        int pageSize = 9,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var query = dbContext.BlogPosts
            .AsNoTracking()
            .Where(blog => blog.IsPublished && blog.PublishedAt != null);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(blog =>
                blog.Title.ToLower().Contains(term) ||
                blog.Excerpt != null && blog.Excerpt.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var blogs = await query
            .OrderByDescending(blog => blog.PublishedAt)
            .ThenByDescending(blog => blog.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Results.Ok(new BlogListResponse(
            page,
            pageSize,
            totalCount,
            blogs.Select(blog => blog.ToResponse(imageStorage)).ToArray()));
    }

    private static async Task<IResult> GetBlogAsync(
        string slug,
        AppDbContext dbContext,
        IImageStorage imageStorage,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        var blog = await dbContext.BlogPosts
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Slug == normalizedSlug && item.IsPublished && item.PublishedAt != null,
                cancellationToken);

        return blog is null ? Results.NotFound() : Results.Ok(blog.ToResponse(imageStorage));
    }
}
