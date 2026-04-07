using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class ReportJobConfiguration : IEntityTypeConfiguration<ReportJob>
    {
        public void Configure(EntityTypeBuilder<ReportJob> builder)
        {
            builder.HasKey(e => e.Id).HasName("report_jobs_pkey");
            builder.ToTable("report_jobs", tb => tb.HasComment("ตารางบันทึกคิวงานและประวัติการสร้างรายงานทั้งหมด"));
            builder.HasIndex(e => new { e.UserId, e.CreatedDatetime }, "idx_report_jobs_user_created").IsDescending(false, true);
            builder.HasIndex(e => new { e.UserId, e.Status, e.CreatedDatetime }, "idx_report_jobs_user_status_created").IsDescending(false, false, true);
            builder.HasIndex(e => new { e.UserId, e.TemplateVersionId, e.CreatedDatetime }, "idx_report_jobs_user_template_created").IsDescending(false, false, true);
            builder.HasOne(d => d.ApiKey).WithMany(p => p.ReportJobs) .HasForeignKey(d => d.ApiKeyId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("report_jobs_api_fkey");
            builder.HasOne(d => d.Subscription).WithMany(p => p.ReportJobs) .HasForeignKey(d => d.SubscriptionId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("report_jobs_sub_fkey");
            builder.HasOne(d => d.TemplateVersion).WithMany(p => p.ReportJobs) .HasForeignKey(d => d.TemplateVersionId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("report_jobs_version_fkey");
            builder.HasOne(d => d.User).WithMany(p => p.ReportJobs) .HasForeignKey(d => d.UserId) .HasConstraintName("report_jobs_user_fkey");
            builder.Property(e => e.RequestData) .HasComment("ข้อมูล JSON ที่ส่งเข้ามาเพื่อสร้างรายงาน") .HasColumnType("jsonb") .HasColumnName("request_data");
        }
    }
}
