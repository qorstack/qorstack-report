using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class CreditPackageConfiguration : IEntityTypeConfiguration<CreditPackage>
    {
        public void Configure(EntityTypeBuilder<CreditPackage> builder)
        {
            builder.HasKey(e => e.Id).HasName("credit_packages_pkey");
            builder.ToTable("credit_packages", tb => tb.HasComment("ตารางเก็บข้อมูลแพ็กเกจเติมเครดิตแบบ Pay-per-use"));
        }
    }
}
