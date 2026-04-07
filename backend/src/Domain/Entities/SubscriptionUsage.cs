using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บยอดการใช้งานฟีเจอร์ต่างๆ แยกตามรอบบิล
/// </summary>
public partial class SubscriptionUsage : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของข้อมูลการใช้โควต้า
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัสการสมัครสมาชิกที่เกี่ยวข้อง
    /// </summary>
    public Guid SubscriptionId { get; set; }

    /// <summary>
    /// รหัสฟีเจอร์ที่นับ (เช่น report_gen)
    /// </summary>
    public string FeatureKey { get; set; } = null!;

    /// <summary>
    /// จำนวนที่ใช้ไปแล้วจริงในรอบปัจจุบัน
    /// </summary>
    public int UsedQuantity { get; set; }

    /// <summary>
    /// วันเวลาที่มีการอัปเดตยอดการใช้งานล่าสุด
    /// </summary>
    public DateTime? LastUpdated { get; set; }

    /// <summary>
    /// ผู้สร้างเรคคอร์ดการนับ
    /// </summary>

    /// <summary>
    /// เวลาที่เริ่มนับครั้งแรก
    /// </summary>

    /// <summary>
    /// ผู้แก้ไขยอดการใช้งาน
    /// </summary>

    /// <summary>
    /// เวลาที่อัปเดตยอดล่าสุด
    /// </summary>

    public virtual Subscription Subscription { get; set; } = null!;
}
