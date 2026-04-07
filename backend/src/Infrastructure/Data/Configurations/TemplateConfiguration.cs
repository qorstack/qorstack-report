using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class TemplateConfiguration : IEntityTypeConfiguration<Template>
    {
        public void Configure(EntityTypeBuilder<Template> builder)
        {
            builder.HasKey(e => e.Id).HasName("templates_pkey");
            builder.ToTable("templates", tb => tb.HasComment("ตารางเก็บข้อมูลหลักของแม่แบบเอกสาร (docx)"));
            builder.HasIndex(e => e.ProjectId, "idx_templates_project_id");
            builder.HasIndex(e => e.UserId, "idx_templates_user_id");
            builder.HasIndex(e => new { e.ProjectId, e.TemplateKey }, "templates_project_key_unique").IsUnique();
            builder.HasOne(d => d.Project).WithMany(p => p.Templates) .HasForeignKey(d => d.ProjectId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("templates_project_id_fkey");
            builder.HasOne(d => d.User).WithMany(p => p.Templates) .HasForeignKey(d => d.UserId) .HasConstraintName("templates_user_id_fkey");
        }
    }
}
