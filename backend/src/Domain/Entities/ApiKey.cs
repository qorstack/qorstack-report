using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บ API Key สำหรับการเรียกใช้งานระบบผ่านโปรแกรม
/// </summary>
public partial class ApiKey : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของ API Key
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัสเจ้าของ Key
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// รหัสโปรเจคที่เป็นเจ้าของ Key (ถ้ามี)
    /// </summary>
    public Guid? ProjectId { get; set; }

    /// <summary>
    /// ค่า Token ลับที่ใช้ยืนยันตัวตนใน Header
    /// </summary>
    public string XApiKey { get; set; } = null!;

    /// <summary>
    /// ชื่อ API Key
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// สถานะการเปิดใช้งาน Key
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// ผู้สร้าง Key
    /// </summary>

    /// <summary>
    /// เวลาที่สร้าง Key
    /// </summary>

    /// <summary>
    /// ผู้แก้ไขสถานะ Key
    /// </summary>

    /// <summary>
    /// เวลาที่แก้ไขล่าสุด
    /// </summary>

    public virtual Project? Project { get; set; }

    public virtual ICollection<ReportJob> ReportJobs { get; set; } = new List<ReportJob>();

    public virtual User User { get; set; } = null!;
}
