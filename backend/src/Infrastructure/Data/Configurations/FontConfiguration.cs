using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class FontConfiguration : IEntityTypeConfiguration<Font>
    {
        public void Configure(EntityTypeBuilder<Font> builder)
        {
            builder.HasKey(e => e.Id).HasName("fonts_pkey");
            builder.ToTable("fonts", tb => tb.HasComment("ตารางเก็บ metadata ของ font ทุกตัวในระบบ (ไฟล์จริงอยู่ใน Local volume หรือ Minio ขึ้นอยู่กับ config)"));
            builder.HasIndex(e => new { e.StorageBucket, e.StorageKey }, "fonts_bucket_key_unique").IsUnique();
            builder.HasIndex(e => e.FamilyName, "idx_fonts_family_name");
            builder.HasIndex(e => e.FileHash, "idx_fonts_file_hash");
            builder.HasIndex(e => e.IsActive, "idx_fonts_is_active");
            builder.HasIndex(e => e.IsSystemFont, "idx_fonts_is_system");
        }
    }
}
