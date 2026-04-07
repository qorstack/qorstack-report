using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class SubscriptionUsageConfiguration : IEntityTypeConfiguration<SubscriptionUsage>
    {
        public void Configure(EntityTypeBuilder<SubscriptionUsage> builder)
        {
            builder.HasKey(e => e.Id).HasName("sub_usages_pkey");
            builder.ToTable("subscription_usages", tb => tb.HasComment("ตารางเก็บยอดการใช้งานฟีเจอร์ต่างๆ แยกตามรอบบิล"));
            builder.HasIndex(e => e.SubscriptionId, "idx_usages_sub_id");
            builder.HasIndex(e => new { e.SubscriptionId, e.FeatureKey }, "sub_usages_unique_key").IsUnique();
            builder.HasOne(d => d.Subscription).WithMany(p => p.SubscriptionUsages) .HasForeignKey(d => d.SubscriptionId) .HasConstraintName("sub_usages_sub_fkey");
        }
    }
}
