using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางนิยามแพ็กเกจสมาชิก (SaaS Plans) และโควต้าต่างๆ
/// </summary>
public partial class Plan : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของแพ็กเกจ
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// ชื่อที่ใช้เรียกแพ็กเกจ เช่น Free, Pro, Enterprise
    /// </summary>
    public string Name { get; set; } = null!;

    /// <summary>
    /// รหัสอ้างอิงของแพ็กเกจสำหรับใช้ใน Logic ของระบบ
    /// </summary>
    public string Code { get; set; } = null!;

    /// <summary>
    /// ราคาค่าบริการรายเดือน/ปี
    /// </summary>
    public decimal? Price { get; set; }

    /// <summary>
    /// สกุลเงิน (เช่น USD, THB)
    /// </summary>
    public string? Currency { get; set; }

    /// <summary>
    /// การกำหนดค่าฟีเจอร์และโควต้าในรูปแบบ JSON (เช่น {&quot;report_limit&quot;: 100})
    /// </summary>
    public string FeaturesConfig { get; set; } = null!;

    /// <summary>
    /// กำหนดว่าจะให้แสดงผลบนหน้า Pricing ของเว็บไซต์หรือไม่
    /// </summary>
    public bool? IsShow { get; set; }

    /// <summary>
    /// ลำดับการแสดงผลบน UI (ค่าน้อยแสดงก่อน)
    /// </summary>
    public int? DisplayOrder { get; set; }

    /// <summary>
    /// สถานะการเปิดใช้งานแพ็กเกจ (ถ้า false จะสมัครใหม่ไม่ได้)
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// ผู้สร้างเรคคอร์ดแผนการใช้งาน
    /// </summary>

    /// <summary>
    /// เวลาที่สร้างแผนการใช้งาน
    /// </summary>

    /// <summary>
    /// ผู้แก้ไขแผนการใช้งานล่าสุด
    /// </summary>

    /// <summary>
    /// เวลาที่แก้ไขแผนการใช้งานล่าสุด
    /// </summary>

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
