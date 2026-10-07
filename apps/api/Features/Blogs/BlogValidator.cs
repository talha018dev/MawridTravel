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
