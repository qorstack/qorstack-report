using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

/// <summary>
/// ตารางเก็บ metadata ของ font ทุกตัวในระบบ (ไฟล์จริงอยู่ใน Local volume หรือ Minio ขึ้นอยู่กับ config)
/// </summary>
public partial class Font
{
    /// <summary>
    /// รหัสเอกลักษณ์ของ font (UUID)
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// ชื่อ font เต็ม เช่น &quot;Sarabun Bold&quot; ได้จาก font metadata (name table ID=4)
    /// </summary>
    public string Name { get; set; } = null!;

    /// <summary>
    /// ชื่อตระกูล font เช่น &quot;Sarabun&quot; ได้จาก font metadata (name table ID=1)
    /// </summary>
    public string FamilyName { get; set; } = null!;

    /// <summary>
    /// ชื่อ style ย่อย เช่น &quot;Bold&quot;, &quot;Italic&quot;, &quot;Regular&quot;
    /// </summary>
    public string SubFamilyName { get; set; } = null!;

    /// <summary>
    /// น้ำหนัก font: 100=Thin, 200=ExtraLight, 300=Light, 400=Regular, 500=Medium, 600=SemiBold, 700=Bold, 800=ExtraBold, 900=Black
    /// </summary>
    public short Weight { get; set; }

    /// <summary>
    /// เป็น italic style หรือไม่
    /// </summary>
    public bool IsItalic { get; set; }

    /// <summary>
    /// รูปแบบไฟล์: ttf (TrueType), otf (OpenType), woff, woff2
    /// </summary>
    public string FileFormat { get; set; } = null!;

    /// <summary>
    /// ขนาดไฟล์จริงในหน่วย bytes
    /// </summary>
    public long FileSizeBytes { get; set; }

    /// <summary>
    /// SHA-256 hash ของไฟล์ ใช้ตรวจสอบ duplicate และความถูกต้องของไฟล์
    /// </summary>
    public string FileHash { get; set; } = null!;

    /// <summary>
    /// ชื่อ bucket ใน Minio (NULL = ใช้ Local storage)
    /// </summary>
    public string? StorageBucket { get; set; }

    /// <summary>
    /// Local: ชื่อไฟล์ เช่น &quot;Sarabun-Bold.ttf&quot; | Minio: path เช่น &quot;fonts/{font_id}/Sarabun-Bold.ttf&quot;
    /// </summary>
    public string StorageKey { get; set; } = null!;

    /// <summary>
    /// path ของรูป preview font (optional, ใช้ storage provider เดียวกับ storage_key)
    /// </summary>
    public string? PreviewImageKey { get; set; }

    public string SyncSource { get; set; } = null!;

    /// <summary>
    /// font ของระบบที่ทุก project ใช้ได้โดยไม่ต้อง grant เช่น Noto Sans, Google Fonts
    /// </summary>
    public bool IsSystemFont { get; set; }

    /// <summary>
    /// font ยังใช้งานอยู่หรือไม่ (soft delete)
    /// </summary>
    public bool IsActive { get; set; }

    public string? Description { get; set; }

    /// <summary>
    /// ชื่อผู้ใช้งานหรือระบบที่สร้างเรคคอร์ดนี้
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// วันเวลาที่ upload font เข้าระบบ
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

    public virtual ICollection<FontOwnership> FontOwnerships { get; set; } = new List<FontOwnership>();
}
