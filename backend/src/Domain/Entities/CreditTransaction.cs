using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางบันทึกการเคลื่อนไหวของเครดิต (Ledger) สำหรับตรวจสอบย้อนหลัง
/// </summary>
public partial class CreditTransaction : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของรายการเครดิต
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัสผู้ใช้งานที่เกี่ยวข้อง
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// รหัสการชำระเงินที่ทำให้เกิดเครดิตนี้ (ถ้ามี)
    /// </summary>
    public Guid? PaymentId { get; set; }

    /// <summary>
    /// ประเภทรายการ: TOPUP (เพิ่ม), USAGE (ใช้), ADJUST (ปรับปรุง), REFUND (คืน)
    /// </summary>
    public string TransactionType { get; set; } = null!;

    /// <summary>
    /// จำนวนเครดิตที่เปลี่ยนแปลง (บวก หรือ ลบ)
    /// </summary>
    public int Amount { get; set; }

    /// <summary>
    /// ยอดเครดิตคงเหลือสุทธิหลังจบรายการนี้ (Snapshot)
    /// </summary>
    public int BalanceAfter { get; set; }

    /// <summary>
    /// รหัสอ้างอิงที่เกี่ยวข้อง (เช่น รหัสงานสร้างรายงาน)
    /// </summary>
    public string? ReferenceId { get; set; }

    /// <summary>
    /// ผู้บันทึกรายการบัญชี
    /// </summary>

    /// <summary>
    /// เวลาที่บันทึกบัญชี
    /// </summary>

    /// <summary>
    /// ผู้แก้ไขรายการบัญชี (ถ้ามี)
    /// </summary>

    /// <summary>
    /// เวลาที่แก้ไขบัญชี
    /// </summary>

    public virtual Payment? Payment { get; set; }

    public virtual User User { get; set; } = null!;
}
