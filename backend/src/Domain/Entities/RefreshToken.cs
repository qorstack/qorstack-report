using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บ Refresh Token สำหรับการต่ออายุ Access Token
/// </summary>
public partial class RefreshToken
{
    /// <summary>
    /// รหัสเอกลักษณ์ของ Refresh Token
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// รหัสผู้ใช้งานที่เกี่ยวข้องกับ Refresh Token
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// ค่า Refresh Token String
    /// </summary>
    public string Token { get; set; } = null!;

    /// <summary>
    /// เวลาที่ Token หมดอายุ
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// เวลาที่ Token ถูกยกเลิก (ถ้ามี)
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// IP Address ที่สร้าง Token
    /// </summary>
    public string? CreatedIp { get; set; }

    /// <summary>
    /// ชื่อผู้ใช้งานหรือระบบที่สร้างเรคคอร์ดนี้
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// วันเวลาที่บันทึกข้อมูลครั้งแรก
    /// </summary>
    public DateTime? CreatedDatetime { get; set; }

    public virtual User User { get; set; } = null!;
}
