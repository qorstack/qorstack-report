using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Fonts.Models;

namespace QorstackReportService.Application.Fonts.Queries.GetProjectFonts;

public class GetProjectFontsQueryHandler : IRequestHandler<GetProjectFontsQuery, List<FontSummaryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetProjectFontsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<FontSummaryDto>> Handle(GetProjectFontsQuery query, CancellationToken ct)
    {
        // --- Validate project access ---
        var hasAccess = await _context.Projects
            .AnyAsync(p => p.Id == query.ProjectId &&
                (p.UserId == query.UserId ||
                 p.ProjectMembers.Any(m => m.UserId == query.UserId && m.IsActive)), ct);

        if (!hasAccess)
            throw new NotFoundException("Project", query.ProjectId);

        var ownedFontsQuery = _context.Fonts
            .Where(f => f.IsActive &&
                        f.FontOwnerships.Any(o => o.ProjectId == query.ProjectId && o.IsActive));

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            ownedFontsQuery = ownedFontsQuery.Where(f =>
                f.Name.Contains(search) || f.FamilyName.Contains(search));
        }

        return await ownedFontsQuery
            .OrderBy(f => f.FamilyName).ThenBy(f => f.Weight)
            .Select(f => new FontSummaryDto
            {
                Id = f.Id,
                Name = f.Name,
                FamilyName = f.FamilyName,
                SubFamilyName = f.SubFamilyName,
                Weight = f.Weight,
                IsItalic = f.IsItalic,
                FileFormat = f.FileFormat,
                FileSizeBytes = f.FileSizeBytes,
                IsSystemFont = f.IsSystemFont,
                AccessType = "owner",
                CreatedDatetime = f.CreatedDatetime,
            })
            .ToListAsync(ct);
    }
}
