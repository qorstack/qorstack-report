using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บเวอร์ชันและที่อยู่ไฟล์จริงของแต่ละแม่แบบ
/// </summary>
public partial class TemplateVersion : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของเวอร์ชันแม่แบบ
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัสแม่แบบหลักที่อ้างอิง
    /// </summary>
    public Guid TemplateId { get; set; }

    /// <summary>
    /// หมายเลขเวอร์ชัน (เช่น 1, 2, 3)
    /// </summary>
    public int Version { get; set; }

    /// <summary>
    /// Path หรือ URL ที่เก็บไฟล์ใน Storage
    /// </summary>
    public string FilePath { get; set; } = null!;

    /// <summary>
    /// สถานะเวอร์ชัน: active (ใช้งานปัจจุบัน), archived (เลิกใช้)
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// ที่อยู่ไฟล์ตัวอย่าง
    /// </summary>
    public string? PreviewFilePath { get; set; }

    /// <summary>
    /// Payload สำหรับทดสอบแม่แบบผ่านหน้า Website
    /// </summary>
    public string? SandboxPayload { get; set; }

    /// <summary>
    /// Path ของไฟล์ PDF ที่ได้จากการ Test Sandbox ล่าสุด
    /// </summary>
    public string? SandboxFilePath { get; set; }

    /// <summary>
    /// ผู้อัปโหลดไฟล์
    /// </summary>

    /// <summary>
    /// เวลาที่อัปโหลดไฟล์
    /// </summary>

    /// <summary>
    /// ผู้แก้ไขสถานะเวอร์ชัน
    /// </summary>

    /// <summary>
    /// เวลาที่แก้ไขล่าสุด
    /// </summary>

    public virtual ICollection<AnalyticsTemplateStat> AnalyticsTemplateStats { get; set; } = new List<AnalyticsTemplateStat>();

    public virtual ICollection<ReportJob> ReportJobs { get; set; } = new List<ReportJob>();

    public virtual Template Template { get; set; } = null!;
}
