namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Renders the first worksheet of an Excel file to a PNG image with visible gridlines.
/// Used for generating template thumbnails and full previews.
/// </summary>
public interface IExcelSnapshotService
{
    /// <summary>
    /// Renders a compact thumbnail of the first sheet (limited rows/cols for dashboard cards).
    /// </summary>
    byte[] RenderThumbnail(Stream excelStream, int quality = 90);

    /// <summary>
    /// Renders the full used range of the first sheet (for builder page "Template Source" preview).
    /// </summary>
    byte[] RenderFullPreview(Stream excelStream, int quality = 90);
}
