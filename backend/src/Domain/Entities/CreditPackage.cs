using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บข้อมูลแพ็กเกจเติมเครดิตแบบ Pay-per-use
/// </summary>
public partial class CreditPackage : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของแพ็กเกจเติมเงิน
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// ชื่อแพ็กเกจเติมเงิน
    /// </summary>
    public string Name { get; set; } = null!;

    /// <summary>
    /// จำนวนเครดิตที่จะได้รับเมื่อซื้อ
    /// </summary>
    public int Credits { get; set; }

    /// <summary>
    /// ราคาขายของแพ็กเกจเติมเงิน
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// สถานะการเปิดขายแพ็กเกจนี้
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// ผู้สร้างแพ็กเกจ
    /// </summary>

    /// <summary>
    /// เวลาที่สร้างแพ็กเกจ
    /// </summary>

    /// <summary>
    /// ผู้แก้ไขแพ็กเกจ
    /// </summary>

    /// <summary>
    /// เวลาที่แก้ไขล่าสุด
    /// </summary>

}
