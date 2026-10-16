namespace QorstackReportService.Application.Common.Utilities;

/// <summary>Result of parsing an HTTP <c>Range</c> header against a file of known length.</summary>
public enum ByteRangeResult
{
    /// <summary>No usable Range header (absent, not "bytes", or several ranges) — send the whole file.</summary>
    Full,
    /// <summary>A single satisfiable range — send 206 with <c>Content-Range</c>.</summary>
    Partial,
    /// <summary>The range starts past the end of the file — send 416.</summary>
    NotSatisfiable
}

/// <summary>
/// Parses a single-range <c>Range: bytes=…</c> header (RFC 9110 §14.1.2): <c>a-b</c>, <c>a-</c> and the
/// suffix form <c>-n</c>. Multi-range requests fall back to the full file, which the RFC allows.
/// </summary>
public static class ByteRange
{
    public static ByteRangeResult Parse(string? header, long length, out long start, out long end)
    {
        start = 0;
        end = length - 1;
        if (string.IsNullOrWhiteSpace(header) || length <= 0) return ByteRangeResult.Full;

        var value = header.Trim();
        if (!value.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase)) return ByteRangeResult.Full;
        var spec = value[6..].Trim();
        if (spec.Contains(',')) return ByteRangeResult.Full;

        var dash = spec.IndexOf('-');
        if (dash < 0) return ByteRangeResult.Full;
        var first = spec[..dash].Trim();
        var last = spec[(dash + 1)..].Trim();

        if (first.Length == 0)
        {
            // Suffix: the last n bytes.
            if (!long.TryParse(last, out var suffix) || suffix <= 0) return ByteRangeResult.Full;
            start = Math.Max(0, length - suffix);
            end = length - 1;
            return ByteRangeResult.Partial;
        }

        if (!long.TryParse(first, out var from) || from < 0) return ByteRangeResult.Full;
        if (from >= length) return ByteRangeResult.NotSatisfiable;

        long to = length - 1;
        if (last.Length > 0)
        {
            if (!long.TryParse(last, out to) || to < from) return ByteRangeResult.Full;
            to = Math.Min(to, length - 1);
        }

        start = from;
        end = to;
        return ByteRangeResult.Partial;
    }
}
