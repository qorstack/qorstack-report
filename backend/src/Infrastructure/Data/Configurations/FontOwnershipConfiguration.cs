using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class FontOwnershipConfiguration : IEntityTypeConfiguration<FontOwnership>
    {
        public void Configure(EntityTypeBuilder<FontOwnership> builder)
        {
            builder.HasKey(e => e.Id).HasName("font_ownerships_pkey");
            builder.ToTable("font_ownerships", tb => tb.HasComment("ตารางเก็บว่า project ไหนเป็นเจ้าของ font (1 font มีเจ้าของได้หลาย project ถ้า upload ไฟล์เดียวกัน) — ระบบเก็บไฟล์ font แค่อันเดียวใน storage"));
            builder.HasIndex(e => new { e.FontId, e.ProjectId }, "font_ownerships_uq").IsUnique();
            builder.HasIndex(e => e.FontId, "idx_font_ownerships_font_id");
            builder.HasIndex(e => e.ProjectId, "idx_font_ownerships_project_id");
            builder.HasOne(d => d.Font).WithMany(p => p.FontOwnerships) .HasForeignKey(d => d.FontId) .HasConstraintName("font_ownerships_fk_font");
            builder.HasOne(d => d.Project).WithMany(p => p.FontOwnerships) .HasForeignKey(d => d.ProjectId) .HasConstraintName("font_ownerships_fk_project");
            builder.HasOne(d => d.UploadedByUser).WithMany(p => p.FontOwnerships) .HasForeignKey(d => d.UploadedByUserId) .OnDelete(DeleteBehavior.ClientSetNull) .HasConstraintName("font_ownerships_fk_user");
        }
    }
}
