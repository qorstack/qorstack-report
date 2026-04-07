using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Templates.Commands.SwitchTemplateVersion;

/// <summary>
/// Handler for SwitchTemplateVersionCommand
/// </summary>
public class SwitchTemplateVersionCommandHandler : IRequestHandler<SwitchTemplateVersionCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;
    private readonly ILogger<SwitchTemplateVersionCommandHandler> _logger;

    public SwitchTemplateVersionCommandHandler(
        IApplicationDbContext context,
        IUser user,
        ILogger<SwitchTemplateVersionCommandHandler> logger)
    {
        _context = context;
        _user = user;
        _logger = logger;
    }

    public async Task<Unit> Handle(SwitchTemplateVersionCommand request, CancellationToken cancellationToken)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            _logger.LogInformation("Switching version for template {TemplateKey} by user {UserId}", request.TemplateKey, request.UserId);

            var template = await _context.Templates
                .Include(t => t.TemplateVersions)
                .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey && t.UserId == request.UserId, cancellationToken);

            if (template == null)
            {
                throw new KeyNotFoundException($"Template with key {request.TemplateKey} not found.");
            }

            TemplateVersion? targetVersion;

            if (request.Version.HasValue)
            {
                targetVersion = template.TemplateVersions.FirstOrDefault(v => v.Version == request.Version.Value);
            }
            else
            {
                throw new ValidationException("Version must be provided");
            }

            if (targetVersion == null)
            {
                throw new KeyNotFoundException($"TemplateVersion {request.Version} not found.");
            }

            // Deactivate all versions
            foreach (var version in template.TemplateVersions)
            {
                if (version.Status == "active")
                {
                    version.Status = "inactive";
                    version.UpdatedBy = _user.Id;
                    version.UpdatedDatetime = DateTime.UtcNow;
                }
            }

            // Activate target version
            targetVersion.Status = "active";
            targetVersion.UpdatedBy = _user.Id;
            targetVersion.UpdatedDatetime = DateTime.UtcNow;
            template.UpdatedBy = _user.Id;
            template.UpdatedDatetime = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            _logger.LogInformation("Successfully switched template {TemplateKey} to version {Version}", request.TemplateKey, targetVersion.Version);

            return Unit.Value;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new ThrowException(ex, new DbUpdateException($"Error switching template version for '{request.TemplateKey}'."), _logger);
        }
    }
}
