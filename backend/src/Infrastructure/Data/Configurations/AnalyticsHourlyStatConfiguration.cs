using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class AnalyticsHourlyStatConfiguration : IEntityTypeConfiguration<AnalyticsHourlyStat>
    {
        public void Configure(EntityTypeBuilder<AnalyticsHourlyStat> builder)
        {
            builder.HasKey(e => e.Id).HasName("analytics_hourly_stats_pkey");
            builder.ToTable("analytics_hourly_stats", tb => tb.HasComment("Pre-computed hourly analytics per user for hourly usage panel"));
            builder.HasIndex(e => new { e.UserId, e.StatDate, e.StatHour }, "analytics_hourly_stats_unique").IsUnique();
            builder.HasIndex(e => new { e.UserId, e.StatDate }, "idx_analytics_hourly_user_date").IsDescending(false, true);
            builder.HasOne(d => d.User).WithMany(p => p.AnalyticsHourlyStats) .HasForeignKey(d => d.UserId) .HasConstraintName("analytics_hourly_stats_user_fkey");
        }
    }
}
