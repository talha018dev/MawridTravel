using MawridTravel.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MawridTravel.Api.Infrastructure.Persistence.Configurations;

internal sealed class ProductOptionValueConfiguration : IEntityTypeConfiguration<ProductOptionValue>
{
    public void Configure(EntityTypeBuilder<ProductOptionValue> builder)
    {
        builder.Property(optionValue => optionValue.Value).HasMaxLength(100);
        builder.Property(optionValue => optionValue.ColorHex).HasMaxLength(7);
        builder.HasIndex(optionValue => new { optionValue.ProductOptionId, optionValue.Value })
            .IsUnique();
        builder.HasIndex(optionValue => new { optionValue.ProductOptionId, optionValue.SortOrder });

        builder.HasOne(optionValue => optionValue.ProductOption)
            .WithMany(option => option.Values)
            .HasForeignKey(optionValue => optionValue.ProductOptionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "CK_ProductOptionValues_SortOrder",
                "\"SortOrder\" >= 0"));
    }
}
