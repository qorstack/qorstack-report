using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเชื่อมโยงผู้ใช้งานกับแพ็กเกจสมาชิกที่ใช้งานอยู่
/// </summary>
public partial class Subscription : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของการสมัครสมาชิก
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัสผู้ใช้งานที่สมัคร
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// รหัสแพ็กเกจที่เลือกสมัคร
    /// </summary>
    public Guid PlanId { get; set; }

    /// <summary>
    /// สถานะการสมัคร: active, canceled, expired
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// วันเวลาเริ่มต้นรอบบิลปัจจุบัน
    /// </summary>
    public DateTime CurrentPeriodStart { get; set; }

    /// <summary>
    /// วันเวลาสิ้นสุดรอบบิลปัจจุบัน (วันตัดโควต้า)
    /// </summary>
    public DateTime CurrentPeriodEnd { get; set; }

    /// <summary>
    /// ผู้บันทึกการสมัครสมาชิก
    /// </summary>

    /// <summary>
    /// เวลาที่เริ่มบันทึกสมาชิก
    /// </summary>

    /// <summary>
    /// ผู้แก้ไขข้อมูลสมาชิก
    /// </summary>

    /// <summary>
    /// เวลาที่แก้ไขข้อมูลสมาชิก
    /// </summary>

    public virtual Plan Plan { get; set; } = null!;

    public virtual ICollection<ReportJob> ReportJobs { get; set; } = new List<ReportJob>();

    public virtual ICollection<SubscriptionUsage> SubscriptionUsages { get; set; } = new List<SubscriptionUsage>();

    public virtual User User { get; set; } = null!;
}
