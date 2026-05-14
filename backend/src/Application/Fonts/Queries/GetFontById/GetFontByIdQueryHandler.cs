using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Fonts.Models;

namespace QorstackReportService.Application.Fonts.Queries.GetFontById;

public class GetFontByIdQueryHandler : IRequestHandler<GetFontByIdQuery, FontDetailDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storage;

    public GetFontByIdQueryHandler(IApplicationDbContext context, IMinioStorageService storage)
    {
        _context = context;
        _storage = storage;
    }

    public async Task<FontDetailDto?> Handle(GetFontByIdQuery query, CancellationToken ct)
    {
        var font = await _context.Fonts
            .Where(f => f.Id == query.FontId && f.IsActive)
            .FirstOrDefaultAsync(ct);

        if (font == null)
            return null;

        string? downloadUrl = null;
        if (font.StorageBucket != null)
        {
            try
            {
                downloadUrl = await _storage.GetPresignedUrlAsync(font.StorageBucket, font.StorageKey, 3600);
            }
            catch
            {
                // presigned URL generation failure is non-fatal
            }
        }

        return new FontDetailDto
        {
            Id = font.Id,
            Name = font.Name,
            FamilyName = font.FamilyName,
            SubFamilyName = font.SubFamilyName,
            Weight = font.Weight,
            IsItalic = font.IsItalic,
            FileFormat = font.FileFormat,
            FileSizeBytes = font.FileSizeBytes,
            IsSystemFont = font.IsSystemFont,
            AccessType = font.IsSystemFont ? "system" : "uploaded",
            CreatedDatetime = font.CreatedDatetime,
            DownloadUrl = downloadUrl,
        };
    }
}
