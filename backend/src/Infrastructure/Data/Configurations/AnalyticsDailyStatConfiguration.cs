using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class AnalyticsDailyStatConfiguration : IEntityTypeConfiguration<AnalyticsDailyStat>
    {
        public void Configure(EntityTypeBuilder<AnalyticsDailyStat> builder)
        {
            builder.HasKey(e => e.Id).HasName("analytics_daily_stats_pkey");
            builder.ToTable("analytics_daily_stats", tb => tb.HasComment("Pre-computed daily analytics per user/project for dashboard performance"));
            builder.HasIndex(e => new { e.UserId, e.ProjectId, e.StatDate }, "analytics_daily_stats_unique").IsUnique();
            builder.HasIndex(e => new { e.UserId, e.StatDate }, "idx_analytics_daily_user_date").IsDescending(false, true);
            builder.HasIndex(e => new { e.UserId, e.ProjectId, e.StatDate }, "idx_analytics_daily_user_project_date").IsDescending(false, false, true);
            builder.HasOne(d => d.User).WithMany(p => p.AnalyticsDailyStats) .HasForeignKey(d => d.UserId) .HasConstraintName("analytics_daily_stats_user_fkey");
        }
    }
}
