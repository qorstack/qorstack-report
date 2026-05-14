namespace QorstackReportService.Domain.Common;

/// <summary>
/// Interface สำหรับ Entity Override
/// ใช้เพื่อระบุว่า Entity นี้เป็น Override ของ Entity หลัก
/// </summary>
/// <typeparam name="TOriginalEntity">Type ของ Entity หลักที่ต้องการ Override</typeparam>
public interface IEntityOverride<TOriginalEntity> where TOriginalEntity : class
{
    /// <summary>
    /// Priority ของ Override (ยิ่งสูงยิ่งมีลำดับความสำคัญมากกว่า)
    /// </summary>
    int Priority => 100;
}
