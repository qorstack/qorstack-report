using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class PlanConfiguration : IEntityTypeConfiguration<Plan>
    {
        public void Configure(EntityTypeBuilder<Plan> builder)
        {
            builder.HasKey(e => e.Id).HasName("plans_pkey");
            builder.ToTable("plans", tb => tb.HasComment("ตารางนิยามแพ็กเกจสมาชิก (SaaS Plans) และโควต้าต่างๆ"));
            builder.HasIndex(e => e.Code, "plans_code_unique").IsUnique();
        }
    }
}
