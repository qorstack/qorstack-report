using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class TemplateVersionConfiguration : IEntityTypeConfiguration<TemplateVersion>
    {
        public void Configure(EntityTypeBuilder<TemplateVersion> builder)
        {
            builder.HasKey(e => e.Id).HasName("template_versions_pkey");
            builder.ToTable("template_versions", tb => tb.HasComment("ตารางเก็บเวอร์ชันและที่อยู่ไฟล์จริงของแต่ละแม่แบบ"));
            builder.HasOne(d => d.Template).WithMany(p => p.TemplateVersions) .HasForeignKey(d => d.TemplateId) .HasConstraintName("template_versions_template_id_fkey");
            builder.Property(e => e.SandboxPayload) .HasComment("Payload สำหรับทดสอบแม่แบบผ่านหน้า Website") .HasColumnType("json") .HasColumnName("sandbox_payload");
        }
    }
}
