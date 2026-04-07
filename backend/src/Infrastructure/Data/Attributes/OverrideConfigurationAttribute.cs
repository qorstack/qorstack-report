namespace QorstackReportService.Infrastructure.Data.Attributes;

/// <summary>
/// Attribute สำหรับระบุว่า Configuration นี้เป็น Override Configuration
/// ระบบจะ apply Override Configuration หลัง Base Configuration เสมอ
/// </summary>
[AttributeUsage(AttributeTargets.Class)]
public class OverrideConfigurationAttribute : Attribute
{
    /// <summary>
    /// ลำดับความสำคัญในการ apply (ยิ่งสูงยิ่งทำหลัง)
    /// </summary>
    public int Priority { get; set; } = 100;

    public OverrideConfigurationAttribute() { }

    public OverrideConfigurationAttribute(int priority)
    {
        Priority = priority;
    }
}
