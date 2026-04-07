using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class ApiKeyConfiguration : IEntityTypeConfiguration<ApiKey>
    {
        public void Configure(EntityTypeBuilder<ApiKey> builder)
        {
            builder.HasKey(e => e.Id).HasName("api_keys_pkey");
            builder.ToTable("api_keys", tb => tb.HasComment("ตารางเก็บ API Key สำหรับการเรียกใช้งานระบบผ่านโปรแกรม"));
            builder.HasIndex(e => e.XApiKey, "api_keys_unique_key").IsUnique();
            builder.HasIndex(e => e.ProjectId, "idx_api_keys_project_id");
            builder.HasIndex(e => e.UserId, "idx_api_keys_user_id");
            builder.HasOne(d => d.Project).WithMany(p => p.ApiKeys) .HasForeignKey(d => d.ProjectId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("api_keys_project_id_fkey");
            builder.HasOne(d => d.User).WithMany(p => p.ApiKeys) .HasForeignKey(d => d.UserId) .HasConstraintName("api_keys_user_id_fkey");
        }
    }
}
