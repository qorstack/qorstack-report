using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บข้อมูล OTP สำหรับยืนยันตัวตน
/// </summary>
public partial class OtpVerification
{
    /// <summary>
    /// รหัสเอกลักษณ์ของ OTP
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// ที่อยู่อีเมลสำหรับใช้ล็อกอินและติดต่อ
    /// </summary>
    public string Email { get; set; } = null!;

    /// <summary>
    /// รหัส OTP ที่ส่งไปยังอีเมล
    /// </summary>
    public string OtpCode { get; set; } = null!;

    /// <summary>
    /// รหัสอ้างอิงสำหรับแสดงคู่กับ OTP
    /// </summary>
    public string RefCode { get; set; } = null!;

    /// <summary>
    /// ประเภท OTP (REGISTER, FORGOT_PASSWORD)
    /// </summary>
    public string Type { get; set; } = null!;

    /// <summary>
    /// เวลาที่ OTP หมดอายุ
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// OTP ถูกยืนยันแล้วหรือไม่
    /// </summary>
    public bool? IsVerified { get; set; }

    /// <summary>
    /// เวลาที่ OTP ถูกยืนยัน
    /// </summary>
    public DateTime? VerifiedAt { get; set; }

    /// <summary>
    /// Token ชั่วคราวที่ออกให้หลังจากยืนยัน OTP สำเร็จ
    /// </summary>
    public string? VerificationToken { get; set; }

    /// <summary>
    /// verify token ถูกใช้แล้วหรือไม่
    /// </summary>
    public bool? IsConsumed { get; set; }

    public DateTime? CreatedDatetime { get; set; }
}
