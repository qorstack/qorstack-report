using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class OtpVerificationConfiguration : IEntityTypeConfiguration<OtpVerification>
    {
        public void Configure(EntityTypeBuilder<OtpVerification> builder)
        {
            builder.HasKey(e => e.Id).HasName("otp_verifications_pkey");
            builder.ToTable("otp_verifications", tb => tb.HasComment("ตารางเก็บข้อมูล OTP สำหรับยืนยันตัวตน"));
            builder.HasIndex(e => e.Email, "idx_otp_email");
            builder.HasIndex(e => e.RefCode, "idx_otp_ref_code");
        }
    }
}
