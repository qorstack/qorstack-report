namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Writes font files to a local path shared with the Gotenberg container,
/// so that LibreOffice can discover and use them during PDF conversion.
/// </summary>
public interface IGotenbergFontCache
{
    /// <summary>
    /// Returns true if a shared fonts path is configured.
    /// </summary>
    bool IsEnabled { get; }

    /// <summary>
    /// Writes a font file to the shared Gotenberg fonts directory.
    /// No-op if FontsPath is not configured.
    /// </summary>
    Task WriteAsync(string fileName, byte[] bytes, CancellationToken ct = default);

    /// <summary>
    /// Deletes a font file from the shared Gotenberg fonts directory.
    /// No-op if FontsPath is not configured or the file does not exist.
    /// </summary>
    Task DeleteAsync(string fileName, CancellationToken ct = default);

    /// <summary>
    /// Lists font file names currently in the root of the shared Gotenberg fonts directory.
    /// Does not recurse into subdirectories (e.g. system/ subdir used by font-syncer).
    /// Returns empty list if FontsPath is not configured.
    /// </summary>
    Task<IReadOnlyList<string>> ListFilesAsync();
}
