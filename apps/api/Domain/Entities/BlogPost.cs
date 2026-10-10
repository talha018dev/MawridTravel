namespace MawridTravel.Api.Domain.Entities;

public sealed class BlogPost
{
    public Guid Id { get; set; }

    public required string Title { get; set; }

    public required string Slug { get; set; }

    public string? Excerpt { get; set; }

    public required string Content { get; set; }

    public string? MetaTitle { get; set; }

    public string? MetaDescription { get; set; }

    public string? CanonicalUrl { get; set; }

    public string? SocialTitle { get; set; }

    public string? SocialDescription { get; set; }

    public string? FeaturedImageObjectKey { get; set; }

    public string? FeaturedImageContentType { get; set; }

    public bool IsPublished { get; set; }

    public DateTimeOffset? PublishedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
