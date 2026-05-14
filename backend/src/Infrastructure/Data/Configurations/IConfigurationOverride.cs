using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace QorstackReportService.Infrastructure.Data.Configurations;

/// <summary>
/// Interface สำหรับ Configuration Override
/// ใช้เพื่อระบุว่า Configuration นี้เป็น Override ของ Configuration หลัก
/// </summary>
/// <typeparam name="TEntity">Type ของ Entity ที่ Configuration นี้ใช้กำหนดค่า</typeparam>
/// <typeparam name="TOriginalConfiguration">Type ของ Configuration หลักที่ต้องการ Override</typeparam>
public interface IConfigurationOverride<TEntity, TOriginalConfiguration> : IEntityTypeConfiguration<TEntity>
    where TEntity : class
    where TOriginalConfiguration : IEntityTypeConfiguration<TEntity>
{
    /// <summary>
    /// Priority ของ Override (ยิ่งสูงยิ่งมีลำดับความสำคัญมากกว่า)
    /// </summary>
    int Priority => 100;

    /// <summary>
    /// กำหนดว่าจะรวม Configuration หลักด้วยหรือไม่
    /// true = รวม Configuration หลักแล้วค่อย Override
    /// false = ใช้เฉพาะ Override Configuration เท่านั้น
    /// </summary>
    bool IncludeOriginalConfiguration => true;

    /// <summary>
    /// Configuration หลักที่จะถูกรวมก่อน Override
    /// </summary>
    TOriginalConfiguration OriginalConfiguration { get; }
}
