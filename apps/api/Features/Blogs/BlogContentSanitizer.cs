using Ganss.Xss;

namespace MawridTravel.Api.Features.Blogs;

internal sealed class BlogContentSanitizer
{
    private static readonly string[] AllowedTags =
    [
        "p", "h2", "h3", "h4", "strong", "em", "s", "code", "pre", "blockquote", "ul", "ol",
        "li", "br", "hr", "a"
    ];

    private readonly HtmlSanitizer _sanitizer = CreateSanitizer();

    public string Sanitize(string? content) => _sanitizer.Sanitize(content ?? string.Empty).Trim();

    private static HtmlSanitizer CreateSanitizer()
    {
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Clear();
        sanitizer.AllowedTags.UnionWith(AllowedTags);
        sanitizer.AllowedAttributes.Clear();
        sanitizer.AllowedAttributes.Add("href");
        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.UnionWith(["http", "https", "mailto"]);
        return sanitizer;
    }
}
