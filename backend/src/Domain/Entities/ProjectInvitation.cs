using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตาราง invitation สำหรับเชิญ user เข้า project ผ่าน email — รองรับทั้งมีบัญชีและยังไม่มีบัญชี
/// </summary>
public partial class ProjectInvitation
{
    /// <summary>
    /// รหัสเอกลักษณ์ของ invitation
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัส project ที่เชิญเข้า
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// email ที่ส่ง invitation link ไป
    /// </summary>
    public string Email { get; set; } = null!;

    /// <summary>
    /// role ที่จะได้รับเมื่อยืนยัน: admin หรือ editor (owner เชิญไม่ได้)
    /// </summary>
    public string Role { get; set; } = null!;

    /// <summary>
    /// secure random token ที่ฝังใน invitation link ใช้ยืนยันตัวตน
    /// </summary>
    public string Token { get; set; } = null!;

    /// <summary>
    /// user ที่กดเชิญ
    /// </summary>
    public Guid InvitedByUserId { get; set; }

    /// <summary>
    /// สถานะ: pending=รอ, accepted=ยอมรับแล้ว, declined=ปฏิเสธ, expired=หมดอายุ, cancelled=ยกเลิก
    /// </summary>
    public string Status { get; set; } = null!;

    /// <summary>
    /// วันหมดอายุของ invitation link (แนะนำ 7 วัน)
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// เวลาที่กดยืนยัน
    /// </summary>
    public DateTime? AcceptedAt { get; set; }

    /// <summary>
    /// user ที่กดยืนยัน (อาจต่างจาก email ถ้า login ด้วยบัญชีอื่น)
    /// </summary>
    public Guid? AcceptedByUserId { get; set; }

    /// <summary>
    /// เวลาที่กดปฏิเสธ
    /// </summary>
    public DateTime? DeclinedAt { get; set; }

    /// <summary>
    /// เวลาที่ผู้เชิญยกเลิก
    /// </summary>
    public DateTime? CancelledAt { get; set; }

    /// <summary>
    /// ชื่อผู้ใช้งานหรือระบบที่สร้างเรคคอร์ดนี้
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// วันเวลาที่สร้าง invitation
    /// </summary>
    public DateTime CreatedDatetime { get; set; }

    public string? UpdatedBy { get; set; }

    public DateTime? UpdatedDatetime { get; set; }

    public virtual User? AcceptedByUser { get; set; }

    public virtual User InvitedByUser { get; set; } = null!;

    public virtual Project Project { get; set; } = null!;
}
