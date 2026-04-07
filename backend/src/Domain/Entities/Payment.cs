using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางบันทึกสถานะการชำระเงินจาก Payment Gateway
/// </summary>
public partial class Payment : BaseAuditableEntity
{
    /// <summary>
    /// รหัสเอกลักษณ์ของรายการชำระเงิน
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัสผู้ใช้งานที่ทำการชำระ
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// รหัสแผนที่ชำระ (ถ้ามี)
    /// </summary>
    public Guid? PlanId { get; set; }

    /// <summary>
    /// ใช้เมื่อเติมเครดิตเอง (จำนวนเครดิตที่ได้รับ)
    /// </summary>
    public int? CreditAmount { get; set; }

    public Guid? PackageId { get; set; }

    /// <summary>
    /// จำนวนเงินสดที่ต้องชำระจริง
    /// </summary>
    public decimal AmountMoney { get; set; }

    /// <summary>
    /// สกุลเงินที่ใช้ชำระ
    /// </summary>
    public string Currency { get; set; } = null!;

    /// <summary>
    /// สถานะธุรกรรม: pending (รอ), success (สำเร็จ), failed (พลาด), expired (หมดอายุ)
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// วิธีการชำระเงิน (เช่น PromptPay, CreditCard)
    /// </summary>
    public string? PaymentMethod { get; set; }

    /// <summary>
    /// รหัสอ้างอิงจากผู้ให้บริการชำระเงินภายนอก
    /// </summary>
    public string? ExternalRef { get; set; }

    /// <summary>
    /// ผู้เริ่มทำรายการชำระเงิน
    /// </summary>

    /// <summary>
    /// เวลาที่เริ่มทำรายการ
    /// </summary>

    /// <summary>
    /// ผู้ยืนยันหรือแก้ไขสถานะการชำระเงิน
    /// </summary>

    /// <summary>
    /// เวลาที่อัปเดตสถานะล่าสุด
    /// </summary>

    public virtual ICollection<CreditTransaction> CreditTransactions { get; set; } = new List<CreditTransaction>();

    public virtual Plan? Plan { get; set; }

    public virtual User User { get; set; } = null!;
}
