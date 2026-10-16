using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Fonts.Queries.GetFontStatus;

/// <summary>Sync status of every uploaded (non-system) font: ready, still syncing to the renderer, or broken.</summary>
public record GetFontStatusQuery : IRequest<List<FontStatusDto>>;

public class FontStatusDto
{
    public Guid Id { get; set; }
    public string Family { get; set; } = string.Empty;
    public short Weight { get; set; }
    /// <summary>"normal" or "italic".</summary>
    public string Style { get; set; } = "normal";
    /// <summary>"ready" | "syncing" | "error".</summary>
    public string Status { get; set; } = FontSyncStatus.Ready;
    public string? Message { get; set; }
}

public class GetFontStatusQueryHandler : IRequestHandler<GetFontStatusQuery, List<FontStatusDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storage;
    private readonly IFontRendererCache _renderer;

    public GetFontStatusQueryHandler(IApplicationDbContext context, IMinioStorageService storage, IFontRendererCache renderer)
    {
        _context = context;
        _storage = storage;
        _renderer = renderer;
    }

    public async Task<List<FontStatusDto>> Handle(GetFontStatusQuery query, CancellationToken ct)
    {
        var fonts = await _context.Fonts
            .Where(f => f.IsActive && !f.IsSystemFont && f.StorageBucket == StorageAreas.Fonts)
            .OrderBy(f => f.FamilyName).ThenBy(f => f.Weight)
            .Select(f => new { f.Id, f.FamilyName, f.Weight, f.IsItalic, f.StorageKey })
            .ToListAsync(ct);
        if (fonts.Count == 0) return [];

        var stored = (await _storage.ListObjectsAsync(StorageAreas.Fonts))
            .Select(o => o.Key)
            .ToHashSet(StringComparer.Ordinal);

        return fonts.Select(f =>
        {
            var (status, message) = FontSyncStatus.Classify(
                stored.Contains(f.StorageKey),
                _renderer.IsConfigured ? _renderer.Contains(f.StorageKey) : null);
            return new FontStatusDto
            {
                Id = f.Id,
                Family = f.FamilyName,
                Weight = f.Weight,
                Style = f.IsItalic ? "italic" : "normal",
                Status = status,
                Message = message
            };
        }).ToList();
    }
}
