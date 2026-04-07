using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
    {
        public void Configure(EntityTypeBuilder<Payment> builder)
        {
            builder.HasKey(e => e.Id).HasName("payments_pkey");
            builder.ToTable("payments", tb => tb.HasComment("ตารางบันทึกสถานะการชำระเงินจาก Payment Gateway"));
            builder.HasOne(d => d.Plan).WithMany(p => p.Payments) .HasForeignKey(d => d.PlanId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("payments_plan_fkey");
            builder.HasOne(d => d.User).WithMany(p => p.Payments) .HasForeignKey(d => d.UserId) .HasConstraintName("payments_user_fkey");
        }
    }
}
