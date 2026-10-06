using MawridTravel.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MawridTravel.Api.Infrastructure.Persistence.Configurations;

internal sealed class ProductImageConfiguration : IEntityTypeConfiguration<ProductImage>
{
    public void Configure(EntityTypeBuilder<ProductImage> builder)
    {
        builder.Property(image => image.ObjectKey).HasMaxLength(512);
        builder.Property(image => image.ContentType).HasMaxLength(100);
        builder.Property(image => image.AltText).HasMaxLength(250);

        builder.HasIndex(image => image.ObjectKey).IsUnique();
        builder.HasIndex(image => new { image.ProductId, image.SortOrder });

        builder.HasOne(image => image.Product)
            .WithMany(product => product.Images)
            .HasForeignKey(image => image.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "CK_ProductImages_SortOrder",
                "\"SortOrder\" >= 0"));
    }
}
