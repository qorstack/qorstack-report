using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางสมาชิกของแต่ละ project พร้อม role — รองรับ multi-user per project
/// </summary>
public partial class ProjectMember
{
    /// <summary>
    /// รหัสเอกลักษณ์ของ membership
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัส project ที่เป็นสมาชิก
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// รหัส user ที่เป็นสมาชิก
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// บทบาท: owner=เจ้าของ, admin=ผู้ดูแล, editor=ผู้แก้ไข/ใช้งาน
    /// </summary>
    public string Role { get; set; } = null!;

    /// <summary>
    /// user ที่เชิญเข้ามา (NULL = เจ้าของดั้งเดิมที่สร้าง project)
    /// </summary>
    public Guid? InvitedByUserId { get; set; }

    /// <summary>
    /// เวลาที่กดยืนยัน invitation (NULL = owner ดั้งเดิมไม่ต้องยืนยัน)
    /// </summary>
    public DateTime? JoinedAt { get; set; }

    /// <summary>
    /// สมาชิกยังอยู่ใน project หรือไม่ (false = ออกจาก project แล้ว)
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// ชื่อผู้ใช้งานหรือระบบที่สร้างเรคคอร์ดนี้
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// วันเวลาที่เพิ่มสมาชิก
    /// </summary>
    public DateTime CreatedDatetime { get; set; }

    /// <summary>
    /// ชื่อผู้ใช้งานหรือระบบที่แก้ไขข้อมูลล่าสุด
    /// </summary>
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// วันเวลาที่แก้ไขข้อมูลล่าสุด
    /// </summary>
    public DateTime? UpdatedDatetime { get; set; }

    public virtual User? InvitedByUser { get; set; }

    public virtual Project Project { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
