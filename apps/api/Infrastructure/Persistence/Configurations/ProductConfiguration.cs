using MawridTravel.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MawridTravel.Api.Infrastructure.Persistence.Configurations;

internal sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.Property(product => product.Name).HasMaxLength(200);
        builder.Property(product => product.Slug).HasMaxLength(220);
        builder.Property(product => product.Description).HasMaxLength(10_000);
        builder.Property(product => product.Sku).HasMaxLength(64);
        builder.Property(product => product.Price).HasPrecision(18, 2);
        builder.Property(product => product.CompareAtPrice).HasPrecision(18, 2);
        builder.Property(product => product.Currency).HasMaxLength(3);
        builder.Property(product => product.StockQuantity).IsConcurrencyToken();

        builder.HasIndex(product => product.Slug).IsUnique();
        builder.HasIndex(product => product.Sku).IsUnique();
        builder.HasIndex(product => new { product.IsActive, product.CreatedAt });

        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("CK_Products_Price", "\"Price\" >= 0");
            tableBuilder.HasCheckConstraint(
                "CK_Products_CompareAtPrice",
                "\"CompareAtPrice\" IS NULL OR \"CompareAtPrice\" >= 0");
            tableBuilder.HasCheckConstraint(
                "CK_Products_StockQuantity",
                "\"StockQuantity\" >= 0");
        });
    }
}
