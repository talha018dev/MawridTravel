using System.Net;
using System.Text.RegularExpressions;

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

        ValidateOptionalLength(errors, "metaTitle", request.MetaTitle, 70, "Meta title");
        ValidateOptionalLength(errors, "metaDescription", request.MetaDescription, 160, "Meta description");
        ValidateOptionalLength(errors, "canonicalUrl", request.CanonicalUrl, 2_048, "Canonical URL");
        ValidateOptionalLength(errors, "socialTitle", request.SocialTitle, 100, "Social title");
        ValidateOptionalLength(errors, "socialDescription", request.SocialDescription, 300, "Social description");

        if (!string.IsNullOrWhiteSpace(request.CanonicalUrl) &&
            (!Uri.TryCreate(request.CanonicalUrl.Trim(), UriKind.Absolute, out var canonicalUri) ||
             canonicalUri.Scheme is not ("http" or "https")))
        {
            errors["canonicalUrl"] = ["Canonical URL must be a valid HTTP or HTTPS URL."];
        }

        if (!HasVisibleContent(request.Content))
        {
            errors["content"] = ["Content is required."];
        }
        else if (request.Content is { } content && content.Trim().Length > 100_000)
        {
            errors["content"] = ["Content must not exceed 100,000 characters."];
        }

        return errors;
    }

    private static void ValidateOptionalLength(
        Dictionary<string, string[]> errors,
        string key,
        string? value,
        int maximumLength,
        string label)
    {
        if (value?.Trim().Length > maximumLength)
        {
            errors[key] = [$"{label} must not exceed {maximumLength:N0} characters."];
        }
    }

    private static bool HasVisibleContent(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return false;
        }

        var text = Regex.Replace(content, "<[^>]*>", string.Empty);
        return !string.IsNullOrWhiteSpace(WebUtility.HtmlDecode(text));
    }
}
