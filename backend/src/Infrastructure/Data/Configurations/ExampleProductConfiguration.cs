using QorstackReportService.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace QorstackReportService.Infrastructure.Data.Configurations;

public class ExampleProductConfiguration : IEntityTypeConfiguration<ExampleProduct>
{
    public void Configure(EntityTypeBuilder<ExampleProduct> builder)
    {
        builder.HasKey(e => e.ProductId).HasName("example_products_pkey");

        builder.ToTable("example_products", "qorstackreport");

        builder.Property(e => e.ProductId)
            .HasDefaultValueSql("nextval('example_products_product_id_seq'::regclass)")
            .HasColumnName("product_id");
        builder.Property(e => e.CategoryId).HasColumnName("category_id");
        builder.Property(e => e.CreatedDatetime)
            .HasDefaultValueSql("now()")
            .HasColumnType("timestamp without time zone")
            .HasColumnName("created");
        builder.Property(e => e.CreatedBy)
            .HasMaxLength(100)
            .HasColumnName("created_by");
        builder.Property(e => e.UpdatedDatetime)
            .HasDefaultValueSql("now()")
            .HasColumnType("timestamp without time zone")
            .HasColumnName("last_modified");
        builder.Property(e => e.UpdatedBy)
            .HasMaxLength(100)
            .HasColumnName("last_modified_by");
        builder.Property(e => e.Name)
            .HasMaxLength(100)
            .HasColumnName("name");
        builder.Property(e => e.Price)
            .HasPrecision(10, 2)
            .HasColumnName("price");

        builder.HasOne(d => d.Category).WithMany(p => p.ExampleProducts)
            .HasForeignKey(d => d.CategoryId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("example_products_category_id_fkey");
    }
}
