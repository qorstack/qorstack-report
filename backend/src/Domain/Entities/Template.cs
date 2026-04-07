using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บข้อมูลหลักของแม่แบบเอกสาร (docx)
/// </summary>
public partial class Template : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของแม่แบบ
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัสเจ้าของแม่แบบ
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// รหัสโปรเจคที่แม่แบบนี้สังกัดอยู่
    /// </summary>
    public Guid? ProjectId { get; set; }

    /// <summary>
    /// คีย์ที่ User กำหนดเองเพื่อใช้เรียกผ่าน API
    /// </summary>
    public string TemplateKey { get; set; } = null!;

    /// <summary>
    /// ชื่อที่แสดงผลของแม่แบบ
    /// </summary>
    public string Name { get; set; } = null!;

    /// <summary>
    /// ผู้สร้างแม่แบบ
    /// </summary>

    /// <summary>
    /// เวลาที่สร้างแม่แบบ
    /// </summary>

    /// <summary>
    /// ผู้แก้ไขชื่อแม่แบบ
    /// </summary>

    /// <summary>
    /// เวลาที่แก้ไขล่าสุด
    /// </summary>

    public virtual Project? Project { get; set; }

    public virtual ICollection<TemplateVersion> TemplateVersions { get; set; } = new List<TemplateVersion>();

    public virtual User User { get; set; } = null!;
}
