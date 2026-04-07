using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Fonts.Commands.DeleteFont;

public class DeleteFontOwnershipCommandHandler : IRequestHandler<DeleteFontOwnershipCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<DeleteFontOwnershipCommandHandler> _logger;

    public DeleteFontOwnershipCommandHandler(
        IApplicationDbContext context,
        ILogger<DeleteFontOwnershipCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Handle(DeleteFontOwnershipCommand command, CancellationToken ct)
    {
        // --- Validate project access ---
        var hasAccess = await _context.Projects
            .AnyAsync(p => p.Id == command.ProjectId &&
                (p.UserId == command.UserId ||
                 p.ProjectMembers.Any(m => m.UserId == command.UserId && m.IsActive)), ct);

        if (!hasAccess)
            throw new NotFoundException("Project", command.ProjectId);

        // --- Find ownership ---
        var ownership = await _context.FontOwnerships
            .FirstOrDefaultAsync(o => o.FontId == command.FontId &&
                                      o.ProjectId == command.ProjectId &&
                                      o.IsActive, ct);

        if (ownership == null)
            throw new NotFoundException("FontOwnership", $"font={command.FontId}, project={command.ProjectId}");

        // --- Soft delete ownership ---
        ownership.IsActive = false;
        await _context.SaveChangesAsync(ct);

        // --- Deactivate font itself if no more active ownerships and not a system font ---
        var font = await _context.Fonts.FindAsync([command.FontId], ct);
        if (font != null && !font.IsSystemFont)
        {
            var hasOtherOwners = await _context.FontOwnerships
                .AnyAsync(o => o.FontId == command.FontId && o.IsActive, ct);

            if (!hasOtherOwners)
            {
                font.IsActive = false;
                font.UpdatedDatetime = DateTime.UtcNow;
                await _context.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Font {FontId} deactivated — no remaining active ownerships", command.FontId);
            }
        }

        _logger.LogInformation(
            "Font ownership removed: font={FontId}, project={ProjectId}",
            command.FontId, command.ProjectId);
    }
}
