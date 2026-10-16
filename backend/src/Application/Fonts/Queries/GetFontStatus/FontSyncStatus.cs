namespace QorstackReportService.Application.Fonts.Queries.GetFontStatus;

/// <summary>Where an uploaded font is on its way to the renderer.</summary>
public static class FontSyncStatus
{
    public const string Ready = "ready";
    public const string Syncing = "syncing";
    public const string Error = "error";

    /// <param name="inStorage">The font file exists in storage (bucket/fonts/).</param>
    /// <param name="inRenderer">The file is in the renderer's font directory; null when the API cannot see it.</param>
    public static (string Status, string? Message) Classify(bool inStorage, bool? inRenderer) => (inStorage, inRenderer) switch
    {
        (false, _) => (Error, "The font file is missing from storage. Upload it again."),
        (true, true) => (Ready, null),
        (true, false) => (Syncing, "Copying to the renderer — usually ready within 30 seconds."),
        (true, null) => (Ready, "Stored. The API cannot see the renderer's font folder, so this is not confirmed."),
    };
}
