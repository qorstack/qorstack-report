using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
    {
        public void Configure(EntityTypeBuilder<Subscription> builder)
        {
            builder.HasKey(e => e.Id).HasName("subscriptions_pkey");
            builder.ToTable("subscriptions", tb => tb.HasComment("ตารางเชื่อมโยงผู้ใช้งานกับแพ็กเกจสมาชิกที่ใช้งานอยู่"));
            builder.HasOne(d => d.Plan).WithMany(p => p.Subscriptions) .HasForeignKey(d => d.PlanId) .OnDelete(DeleteBehavior.Restrict) .HasConstraintName("subscriptions_plan_fkey");
            builder.HasOne(d => d.User).WithMany(p => p.Subscriptions) .HasForeignKey(d => d.UserId) .HasConstraintName("subscriptions_user_fkey");
        }
    }
}
