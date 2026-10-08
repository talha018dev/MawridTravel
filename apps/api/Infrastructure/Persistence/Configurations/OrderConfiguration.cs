using MawridTravel.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MawridTravel.Api.Infrastructure.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.Property(order => order.IdempotencyKey).HasMaxLength(64);
        builder.Property(order => order.RequestFingerprint).HasMaxLength(64);
        builder.Property(order => order.OrderNumber).HasMaxLength(32);
        builder.Property(order => order.FullName).HasMaxLength(200);
        builder.Property(order => order.Phone).HasMaxLength(30);
        builder.Property(order => order.Email).HasMaxLength(320);
        builder.Property(order => order.Address).HasMaxLength(1_000);
        builder.Property(order => order.DeliveryArea).HasMaxLength(30);
        builder.Property(order => order.PaymentMethod).HasMaxLength(40);
        builder.Property(order => order.Status).HasMaxLength(30);
        builder.Property(order => order.Currency).HasMaxLength(3);
        builder.Property(order => order.Subtotal).HasPrecision(18, 2);
        builder.Property(order => order.DeliveryFee).HasPrecision(18, 2);
        builder.Property(order => order.Total).HasPrecision(18, 2);

        builder.HasIndex(order => order.OrderNumber).IsUnique();
        builder.HasIndex(order => order.IdempotencyKey).IsUnique();
        builder.HasIndex(order => new { order.Status, order.CreatedAt });

        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("CK_Orders_Subtotal", "\"Subtotal\" >= 0");
            tableBuilder.HasCheckConstraint("CK_Orders_DeliveryFee", "\"DeliveryFee\" >= 0");
            tableBuilder.HasCheckConstraint("CK_Orders_Total", "\"Total\" >= 0");
        });
    }
}
