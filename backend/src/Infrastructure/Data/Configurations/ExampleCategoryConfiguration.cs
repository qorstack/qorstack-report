using QorstackReportService.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace QorstackReportService.Infrastructure.Data.Configurations;

public class ExampleCategoryConfiguration : IEntityTypeConfiguration<ExampleCategory>
{
    public void Configure(EntityTypeBuilder<ExampleCategory> builder)
    {
        builder.HasKey(e => e.CategoryId).HasName("example_categories_pkey");

        builder.ToTable("example_categories", "qorstackreport");

        builder.Property(e => e.CategoryId)
            .HasDefaultValueSql("nextval('example_categories_category_id_seq'::regclass)")
            .HasColumnName("category_id");
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
    }
}
