namespace MawridTravel.Api.Features.Blogs;

internal static class BlogValidator
{
    public static Dictionary<string, string[]> Validate(BlogWriteRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors["title"] = ["Title is required."];
        }
        else if (request.Title.Trim().Length > 200)
        {
            errors["title"] = ["Title must not exceed 200 characters."];
        }

        if (request.Slug?.Trim().Length > 220)
        {
            errors["slug"] = ["Slug must not exceed 220 characters."];
        }

        if (request.Excerpt?.Trim().Length > 500)
        {
            errors["excerpt"] = ["Excerpt must not exceed 500 characters."];
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            errors["content"] = ["Content is required."];
        }
        else if (request.Content.Trim().Length > 100_000)
        {
            errors["content"] = ["Content must not exceed 100,000 characters."];
        }

        var featuredImageUrl = request.FeaturedImageUrl?.Trim();
        if (featuredImageUrl?.Length > 2_048)
        {
            errors["featuredImageUrl"] = ["Featured image URL must not exceed 2,048 characters."];
        }
        else if (!string.IsNullOrWhiteSpace(featuredImageUrl) &&
                 (!Uri.TryCreate(featuredImageUrl, UriKind.Absolute, out var uri) ||
                  uri.Scheme is not ("http" or "https")))
        {
            errors["featuredImageUrl"] = ["Featured image URL must be a valid HTTP or HTTPS URL."];
        }

        return errors;
    }
}
