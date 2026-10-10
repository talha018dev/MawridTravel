namespace MawridTravel.Api.Features.Blogs;

internal sealed record BlogWriteRequest(
    string Title,
    string? Slug,
    string? Excerpt,
    string? Content,
    string? MetaTitle,
    string? MetaDescription,
    string? CanonicalUrl,
    string? SocialTitle,
    string? SocialDescription,
    bool IsPublished);

internal sealed record BlogResponse(
    Guid Id,
    string Title,
    string Slug,
    string? Excerpt,
    string Content,
    string? MetaTitle,
    string? MetaDescription,
    string? CanonicalUrl,
    string? SocialTitle,
    string? SocialDescription,
    string? FeaturedImageUrl,
    bool IsPublished,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed record BlogListResponse(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyList<BlogResponse> Items);
