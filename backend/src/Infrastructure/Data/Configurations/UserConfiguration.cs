using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.HasKey(e => e.Id).HasName("users_pkey");
            builder.ToTable("users", tb => tb.HasComment("ตารางหลักที่เก็บข้อมูลบัญชีผู้ใช้งานและยอดเครดิตคงเหลือ"));
            builder.HasIndex(e => e.GithubId, "idx_users_github_id");
            builder.HasIndex(e => e.GitlabId, "idx_users_gitlab_id");
            builder.HasIndex(e => e.GoogleId, "idx_users_google_id");
            builder.HasIndex(e => e.Email, "users_email_key").IsUnique();
        }
    }
}
