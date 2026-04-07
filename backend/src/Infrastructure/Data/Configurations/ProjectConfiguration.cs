using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class ProjectConfiguration : IEntityTypeConfiguration<Project>
    {
        public void Configure(EntityTypeBuilder<Project> builder)
        {
            builder.HasKey(e => e.Id).HasName("projects_pkey");
            builder.ToTable("projects", tb => tb.HasComment("ตารางเก็บข้อมูล Project สำหรับจัดกลุ่ม Template และ API Key"));
            builder.HasIndex(e => e.UserId, "idx_projects_user_id");
            builder.HasOne(d => d.User).WithMany(p => p.Projects) .HasForeignKey(d => d.UserId) .HasConstraintName("projects_user_fkey");
        }
    }
}
