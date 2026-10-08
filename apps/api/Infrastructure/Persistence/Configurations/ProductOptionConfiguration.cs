using MawridTravel.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MawridTravel.Api.Infrastructure.Persistence.Configurations;

internal sealed class ProductOptionConfiguration : IEntityTypeConfiguration<ProductOption>
{
    public void Configure(EntityTypeBuilder<ProductOption> builder)
    {
        builder.Property(option => option.Name).HasMaxLength(50);
        builder.HasIndex(option => new { option.ProductId, option.Name }).IsUnique();
        builder.HasIndex(option => new { option.ProductId, option.SortOrder });

        builder.HasOne(option => option.Product)
            .WithMany(product => product.Options)
            .HasForeignKey(option => option.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "CK_ProductOptions_SortOrder",
                "\"SortOrder\" >= 0"));
    }
}
