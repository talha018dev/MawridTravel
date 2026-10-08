namespace MawridTravel.Api.Features.Products;

internal static class ProductValidator
{
    public static Dictionary<string, string[]> Validate(ProductWriteRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors["name"] = ["Name is required."];
        }
        else if (request.Name.Trim().Length > 200)
        {
            errors["name"] = ["Name must not exceed 200 characters."];
        }

        if (request.Slug?.Trim().Length > 220)
        {
            errors["slug"] = ["Slug must not exceed 220 characters."];
        }

        if (request.Description?.Trim().Length > 10_000)
        {
            errors["description"] = ["Description must not exceed 10,000 characters."];
        }

        if (request.Sku?.Trim().Length > 64)
        {
            errors["sku"] = ["SKU must not exceed 64 characters."];
        }

        if (request.Price < 0)
        {
            errors["price"] = ["Price must be zero or greater."];
        }

        if (request.CompareAtPrice is < 0)
        {
            errors["compareAtPrice"] = ["Compare-at price must be zero or greater."];
        }

        var currency = request.Currency?.Trim();
        if (currency is null || currency.Length != 3 ||
            currency.Any(character => !char.IsAsciiLetter(character)))
        {
            errors["currency"] = ["Currency must be a three-letter ISO currency code."];
        }

        if (request.StockQuantity < 0)
        {
            errors["stockQuantity"] = ["Stock quantity must be zero or greater."];
        }

        ValidateOptions(request.Options, errors);

        return errors;
    }

    private static void ValidateOptions(
        IReadOnlyList<ProductOptionWriteRequest>? options,
        Dictionary<string, string[]> errors)
    {
        if (options is null)
        {
            return;
        }

        if (options.Count > 5)
        {
            errors["options"] = ["A product cannot have more than five options."];
            return;
        }

        var optionNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var optionIndex = 0; optionIndex < options.Count; optionIndex++)
        {
            var option = options[optionIndex];
            var name = option.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name) || name.Length > 50)
            {
                errors[$"options[{optionIndex}].name"] =
                    ["Option name is required and must not exceed 50 characters."];
            }
            else if (!optionNames.Add(name))
            {
                errors[$"options[{optionIndex}].name"] = ["Option names must be unique."];
            }

            if (option.SortOrder < 0)
            {
                errors[$"options[{optionIndex}].sortOrder"] =
                    ["Sort order must be zero or greater."];
            }

            if (option.Values is null || option.Values.Count == 0)
            {
                errors[$"options[{optionIndex}].values"] =
                    ["Each option must contain at least one value."];
                continue;
            }

            if (option.Values.Count > 50)
            {
                errors[$"options[{optionIndex}].values"] =
                    ["An option cannot contain more than 50 values."];
                continue;
            }

            var values = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (var valueIndex = 0; valueIndex < option.Values.Count; valueIndex++)
            {
                var value = option.Values[valueIndex];
                var normalizedValue = value.Value?.Trim();
                var key = $"options[{optionIndex}].values[{valueIndex}]";
                if (string.IsNullOrWhiteSpace(normalizedValue) || normalizedValue.Length > 100)
                {
                    errors[$"{key}.value"] =
                        ["Option value is required and must not exceed 100 characters."];
                }
                else if (!values.Add(normalizedValue))
                {
                    errors[$"{key}.value"] = ["Option values must be unique."];
                }

                if (value.ColorHex is not null &&
                    !System.Text.RegularExpressions.Regex.IsMatch(
                        value.ColorHex,
                        "^#[0-9A-Fa-f]{6}$"))
                {
                    errors[$"{key}.colorHex"] =
                        ["Color must be a six-digit hex value such as #1D4ED8."];
                }
                else if (string.Equals(name, "Color", StringComparison.OrdinalIgnoreCase) &&
                         value.ColorHex is null)
                {
                    errors[$"{key}.colorHex"] = ["A swatch color is required."];
                }

                if (value.SortOrder < 0)
                {
                    errors[$"{key}.sortOrder"] = ["Sort order must be zero or greater."];
                }
            }
        }
    }

    public static Dictionary<string, string[]> ValidateImage(
        string? altText,
        int sortOrder)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (altText?.Trim().Length > 250)
        {
            errors["altText"] = ["Alternative text must not exceed 250 characters."];
        }

        if (sortOrder < 0)
        {
            errors["sortOrder"] = ["Sort order must be zero or greater."];
        }

        return errors;
    }
}
