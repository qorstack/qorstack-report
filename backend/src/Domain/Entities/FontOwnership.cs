using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บว่า project ไหนเป็นเจ้าของ font (1 font มีเจ้าของได้หลาย project ถ้า upload ไฟล์เดียวกัน) — ระบบเก็บไฟล์ font แค่อันเดียวใน storage
/// </summary>
public partial class FontOwnership
{
    /// <summary>
    /// รหัสเอกลักษณ์ของ ownership record
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัส font ที่เป็นเจ้าของ
    /// </summary>
    public Guid FontId { get; set; }

    /// <summary>
    /// รหัส project ที่เป็นเจ้าของ font — ทุก member ใน project นี้ใช้ font ได้
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// รหัส user ที่กด upload font เก็บไว้เพื่อ audit trail ไม่ได้ใช้ตรวจสิทธิ์
    /// </summary>
    public Guid UploadedByUserId { get; set; }

    /// <summary>
    /// บันทึกข้อมูลลิขสิทธิ์ที่ผู้ upload ระบุไว้
    /// </summary>
    public string? LicenseNote { get; set; }

    /// <summary>
    /// ownership ยังมีผลอยู่หรือไม่
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// ชื่อผู้ใช้งานหรือระบบที่สร้างเรคคอร์ดนี้
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// วันเวลาที่บันทึกความเป็นเจ้าของ
    /// </summary>
    public DateTime CreatedDatetime { get; set; }

    public virtual Font Font { get; set; } = null!;

    public virtual Project Project { get; set; } = null!;

    public virtual User UploadedByUser { get; set; } = null!;
}
