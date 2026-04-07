using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class AnalyticsTemplateStatConfiguration : IEntityTypeConfiguration<AnalyticsTemplateStat>
    {
        public void Configure(EntityTypeBuilder<AnalyticsTemplateStat> builder)
        {
            builder.HasKey(e => e.Id).HasName("analytics_template_stats_pkey");
            builder.ToTable("analytics_template_stats", tb => tb.HasComment("Pre-computed template-level analytics per user for performance matrix"));
            builder.HasIndex(e => new { e.UserId, e.TemplateVersionId, e.StatDate }, "analytics_template_stats_unique").IsUnique();
            builder.HasIndex(e => new { e.UserId, e.StatDate }, "idx_analytics_template_user_date").IsDescending(false, true);
            builder.HasIndex(e => new { e.UserId, e.TemplateVersionId, e.StatDate }, "idx_analytics_template_user_version").IsDescending(false, false, true);
            builder.HasOne(d => d.TemplateVersion).WithMany(p => p.AnalyticsTemplateStats) .HasForeignKey(d => d.TemplateVersionId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("analytics_template_stats_version_fkey");
            builder.HasOne(d => d.User).WithMany(p => p.AnalyticsTemplateStats) .HasForeignKey(d => d.UserId) .HasConstraintName("analytics_template_stats_user_fkey");
        }
    }
}
