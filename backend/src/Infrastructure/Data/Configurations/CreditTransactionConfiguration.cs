using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class CreditTransactionConfiguration : IEntityTypeConfiguration<CreditTransaction>
    {
        public void Configure(EntityTypeBuilder<CreditTransaction> builder)
        {
            builder.HasKey(e => e.Id).HasName("credit_trans_pkey");
            builder.ToTable("credit_transactions", tb => tb.HasComment("ตารางบันทึกการเคลื่อนไหวของเครดิต (Ledger) สำหรับตรวจสอบย้อนหลัง"));
            builder.HasOne(d => d.Payment).WithMany(p => p.CreditTransactions) .HasForeignKey(d => d.PaymentId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("credit_trans_pay_fkey");
            builder.HasOne(d => d.User).WithMany(p => p.CreditTransactions) .HasForeignKey(d => d.UserId) .HasConstraintName("credit_trans_user_fkey");
        }
    }
}
