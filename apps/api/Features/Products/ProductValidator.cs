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

        if (request.CompareAtPrice is < 0 ||
            request.CompareAtPrice.HasValue && request.CompareAtPrice < request.Price)
        {
            errors["compareAtPrice"] =
                ["Compare-at price must be greater than or equal to the price."];
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

        return errors;
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
