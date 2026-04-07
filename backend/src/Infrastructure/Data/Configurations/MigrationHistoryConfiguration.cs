using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class MigrationHistoryConfiguration : IEntityTypeConfiguration<MigrationHistory>
    {
        public void Configure(EntityTypeBuilder<MigrationHistory> builder)
        {
            builder.HasKey(e => e.Id).HasName("__migration_history_pkey");
            builder.ToTable("__migration_history");
            builder.HasIndex(e => e.FileName, "__migration_history_file_name_key").IsUnique();
        }
    }
}
