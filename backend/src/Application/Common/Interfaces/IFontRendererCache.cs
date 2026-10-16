namespace QorstackReportService.Application.Common.Interfaces;

/// <summary>
/// Read-only view of the font directory the renderer (Gotenberg) uses, so the API can tell whether an
/// uploaded font has reached it. font-syncer copies <c>{bucket}/fonts/{key}</c> to <c>{cache}/{key}</c>.
/// </summary>
public interface IFontRendererCache
{
    /// <summary>False when the API cannot see the renderer's font directory (status is then unknown).</summary>
    bool IsConfigured { get; }

    /// <summary>True when the font file for this storage key is present in the renderer's font directory.</summary>
    bool Contains(string storageKey);
}
