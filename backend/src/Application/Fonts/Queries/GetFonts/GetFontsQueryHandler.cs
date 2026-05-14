using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Fonts.Models;

namespace QorstackReportService.Application.Fonts.Queries.GetFonts;

public class GetFontsQueryHandler : IRequestHandler<GetFontsQuery, List<FontSummaryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetFontsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<FontSummaryDto>> Handle(GetFontsQuery query, CancellationToken ct)
    {
        var fontsQuery = _context.Fonts.Where(f => f.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            fontsQuery = fontsQuery.Where(f =>
                f.Name.Contains(search) || f.FamilyName.Contains(search));
        }

        return await fontsQuery
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
                AccessType = f.IsSystemFont ? "system" : "uploaded",
                CreatedDatetime = f.CreatedDatetime,
            })
            .ToListAsync(ct);
    }
}
