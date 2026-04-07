namespace QorstackReportService.Infrastructure.Services.Font;

/// <summary>
/// อ่าน metadata จากชื่อไฟล์ font
/// เช่น "Sarabun-Bold.ttf" → FamilyName="Sarabun", SubFamilyName="Bold", Weight=700
///
/// NOTE: อ่านจากชื่อไฟล์เท่านั้น (ไม่ parse binary) เพราะ Google Fonts ตั้งชื่อไฟล์ตาม convention
/// ถ้าต้องการ parse จาก font binary จริงๆ ให้ใช้ NuGet: Typography.OpenFont
/// </summary>
public static class FontMetadataReader
{
    // map suffix → (weight, isItalic)
    private static readonly Dictionary<string, (short Weight, bool IsItalic)> StyleMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Thin"]            = (100, false),
            ["ThinItalic"]      = (100, true),
            ["ExtraLight"]      = (200, false),
            ["ExtraLightItalic"]= (200, true),
            ["Light"]           = (300, false),
            ["LightItalic"]     = (300, true),
            ["Regular"]         = (400, false),
            ["Italic"]          = (400, true),
            ["Medium"]          = (500, false),
            ["MediumItalic"]    = (500, true),
            ["SemiBold"]        = (600, false),
            ["SemiBoldItalic"]  = (600, true),
            ["Bold"]            = (700, false),
            ["BoldItalic"]      = (700, true),
            ["ExtraBold"]       = (800, false),
            ["ExtraBoldItalic"] = (800, true),
            ["Black"]           = (900, false),
            ["BlackItalic"]     = (900, true),
        };

    public static FontMeta Read(byte[] _, string fileName)
    {
        // ตัด extension ออก เช่น "Sarabun-Bold.ttf" → "Sarabun-Bold"
        var baseName = Path.GetFileNameWithoutExtension(fileName);

        // ตัด variable font suffix เช่น "AlbertSans[wght]" → "AlbertSans"
        var bracketIndex = baseName.IndexOf('[');
        if (bracketIndex > 0)
            baseName = baseName[..bracketIndex];

        // แยก FamilyName กับ Style ด้วย "-"
        var dashIndex = baseName.IndexOf('-');
        if (dashIndex < 0)
        {
            // ไม่มี dash — ทั้งหมดเป็น family name, style = Regular
            return new FontMeta
            {
                Name = baseName,
                FamilyName = baseName,
                SubFamilyName = "Regular",
                Weight = 400,
                IsItalic = false,
            };
        }

        var family = baseName[..dashIndex];
        var styleSuffix = baseName[(dashIndex + 1)..];

        var (weight, isItalic) = StyleMap.TryGetValue(styleSuffix, out var style)
            ? style
            : ((short)400, styleSuffix.Contains("italic", StringComparison.OrdinalIgnoreCase));

        return new FontMeta
        {
            Name = $"{family} {styleSuffix}",
            FamilyName = family,
            SubFamilyName = styleSuffix,
            Weight = weight,
            IsItalic = isItalic,
        };
    }
}

public record FontMeta
{
    public required string Name { get; init; }
    public required string FamilyName { get; init; }
    public required string SubFamilyName { get; init; }
    public required short Weight { get; init; }
    public required bool IsItalic { get; init; }
}
