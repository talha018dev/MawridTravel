using MawridTravel.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MawridTravel.Api.Infrastructure.Persistence.Configurations;

internal sealed class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.Property(item => item.ProductName).HasMaxLength(200);
        builder.Property(item => item.ProductSlug).HasMaxLength(220);
        builder.Property(item => item.Color).HasMaxLength(100);
        builder.Property(item => item.ColorHex).HasMaxLength(7);
        builder.Property(item => item.Size).HasMaxLength(100);
        builder.Property(item => item.UnitPrice).HasPrecision(18, 2);
        builder.Property(item => item.LineTotal).HasPrecision(18, 2);

        builder.HasOne(item => item.Order)
            .WithMany(order => order.Items)
            .HasForeignKey(item => item.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(item => item.OrderId);
        builder.HasIndex(item => item.ProductId);
        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("CK_OrderItems_UnitPrice", "\"UnitPrice\" >= 0");
            tableBuilder.HasCheckConstraint("CK_OrderItems_Quantity", "\"Quantity\" > 0");
            tableBuilder.HasCheckConstraint("CK_OrderItems_LineTotal", "\"LineTotal\" >= 0");
        });
    }
}
