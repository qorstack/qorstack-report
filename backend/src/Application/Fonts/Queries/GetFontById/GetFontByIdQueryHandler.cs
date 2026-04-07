using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Exceptions;
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
        // --- Validate project access ---
        var hasAccess = await _context.Projects
            .AnyAsync(p => p.Id == query.ProjectId &&
                (p.UserId == query.UserId ||
                 p.ProjectMembers.Any(m => m.UserId == query.UserId && m.IsActive)), ct);

        if (!hasAccess)
            throw new NotFoundException("Project", query.ProjectId);

        var font = await _context.Fonts
            .Where(f => f.Id == query.FontId && f.IsActive)
            .FirstOrDefaultAsync(ct);

        if (font == null)
            return null;

        // Determine access type and ownership
        string accessType;
        FontDetailDto dto;

        if (font.IsSystemFont)
        {
            accessType = "system";
            dto = new FontDetailDto
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
                AccessType = accessType,
                CreatedDatetime = font.CreatedDatetime,
            };
        }
        else
        {
            // Must be owned by this project
            var ownership = await _context.FontOwnerships
                .FirstOrDefaultAsync(o => o.FontId == font.Id &&
                                          o.ProjectId == query.ProjectId &&
                                          o.IsActive, ct);

            if (ownership == null)
                return null; // font exists but this project doesn't own it

            accessType = "owner";
            dto = new FontDetailDto
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
                AccessType = accessType,
                CreatedDatetime = font.CreatedDatetime,
                OwnershipId = ownership.Id,
                LicenseNote = ownership.LicenseNote,
            };

            if (font.StorageBucket != null)
            {
                try
                {
                    dto.DownloadUrl = await _storage.GetPresignedUrlAsync(
                        font.StorageBucket, font.StorageKey, 3600);
                }
                catch
                {
                    // presigned URL generation failure is non-fatal
                }
            }
        }

        return dto;
    }
}
