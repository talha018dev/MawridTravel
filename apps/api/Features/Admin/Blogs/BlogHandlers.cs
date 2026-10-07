using MawridTravel.Api.Domain.Entities;
using MawridTravel.Api.Features.Blogs;
using MawridTravel.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MawridTravel.Api.Features.Admin.Blogs;

internal static class BlogHandlers
{
    public static async Task<IResult> GetBlogsAsync(
        AppDbContext dbContext,
        string? search,
        bool? isPublished,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.BlogPosts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(blog =>
                blog.Title.ToLower().Contains(term) ||
                blog.Slug.ToLower().Contains(term) ||
                blog.Excerpt != null && blog.Excerpt.ToLower().Contains(term));
        }

        if (isPublished.HasValue)
        {
            query = query.Where(blog => blog.IsPublished == isPublished.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var blogs = await query
            .OrderByDescending(blog => blog.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Results.Ok(new BlogListResponse(
            page,
            pageSize,
            totalCount,
            blogs.Select(blog => blog.ToResponse()).ToArray()));
    }

    public static async Task<IResult> GetBlogAsync(
        Guid id,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var blog = await dbContext.BlogPosts
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return blog is null ? Results.NotFound() : Results.Ok(blog.ToResponse());
    }

    public static async Task<IResult> CreateBlogAsync(
        BlogWriteRequest request,
        AppDbContext dbContext,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var errors = BlogValidator.Validate(request);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var now = timeProvider.GetUtcNow();
        var slugSource = string.IsNullOrWhiteSpace(request.Slug) ? request.Title : request.Slug;
        var blog = new BlogPost
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Slug = await BlogHelpers.CreateUniqueSlugAsync(
                dbContext,
                slugSource!,
                null,
                cancellationToken),
            Excerpt = NormalizeOptional(request.Excerpt),
            Content = request.Content!.Trim(),
            FeaturedImageUrl = NormalizeOptional(request.FeaturedImageUrl),
            IsPublished = request.IsPublished,
            PublishedAt = request.IsPublished ? now : null,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.BlogPosts.Add(blog);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/admin/blogs/{blog.Id}", blog.ToResponse());
    }

    public static async Task<IResult> UpdateBlogAsync(
        Guid id,
        BlogWriteRequest request,
        AppDbContext dbContext,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var errors = BlogValidator.Validate(request);
        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var blog = await dbContext.BlogPosts
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (blog is null)
        {
            return Results.NotFound();
        }

        var now = timeProvider.GetUtcNow();
        var slugSource = string.IsNullOrWhiteSpace(request.Slug) ? request.Title! : request.Slug;
        blog.Title = request.Title!.Trim();
        blog.Slug = await BlogHelpers.CreateUniqueSlugAsync(
            dbContext,
            slugSource!,
            id,
            cancellationToken);
        blog.Excerpt = NormalizeOptional(request.Excerpt);
        blog.Content = request.Content!.Trim();
        blog.FeaturedImageUrl = NormalizeOptional(request.FeaturedImageUrl);
        blog.IsPublished = request.IsPublished;
        blog.PublishedAt = request.IsPublished ? blog.PublishedAt ?? now : null;
        blog.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.Ok(blog.ToResponse());
    }

    public static async Task<IResult> DeleteBlogAsync(
        Guid id,
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var blog = await dbContext.BlogPosts
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (blog is null)
        {
            return Results.NotFound();
        }

        dbContext.BlogPosts.Remove(blog);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
