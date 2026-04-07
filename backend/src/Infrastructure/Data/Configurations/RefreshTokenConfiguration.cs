using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
    {
        public void Configure(EntityTypeBuilder<RefreshToken> builder)
        {
            builder.HasKey(e => e.Id).HasName("refresh_tokens_pkey");
            builder.ToTable("refresh_tokens", tb => tb.HasComment("ตารางเก็บ Refresh Token สำหรับการต่ออายุ Access Token"));
            builder.HasIndex(e => e.Token, "idx_refresh_tokens_token");
            builder.HasIndex(e => e.UserId, "idx_refresh_tokens_user_id");
            builder.HasOne(d => d.User).WithMany(p => p.RefreshTokens) .HasForeignKey(d => d.UserId) .HasConstraintName("refresh_tokens_user_fkey");
        }
    }
}
