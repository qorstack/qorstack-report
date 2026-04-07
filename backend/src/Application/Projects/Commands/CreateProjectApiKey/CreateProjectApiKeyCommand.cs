using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Projects.Commands.CreateProjectApiKey;

public record CreateProjectApiKeyCommand(Guid ProjectId, string Name) : IRequest<string>; // Returns the API Key string

public class CreateProjectApiKeyCommandHandler : IRequestHandler<CreateProjectApiKeyCommand, string>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _currentUser;

    public CreateProjectApiKeyCommandHandler(IApplicationDbContext context, IUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<string> Handle(CreateProjectApiKeyCommand request, CancellationToken cancellationToken)
    {
        var userIdStr = _currentUser.Id;
        if (userIdStr == null) throw new UnauthorizedAccessException();
        var userId = Guid.Parse(userIdStr);

        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.UserId == userId, cancellationToken);

        if (project == null) throw new KeyNotFoundException("Project not found");

        // Deactivate old keys
        var existingKeys = await _context.ApiKeys
            .Where(k => k.ProjectId == project.Id && k.IsActive == true)
            .ToListAsync(cancellationToken);

        foreach (var key in existingKeys)
        {
            key.IsActive = false;
        }

        var apiKeyString = "sk_live_" + Guid.NewGuid().ToString("N");

        var apiKey = new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProjectId = project.Id,
            XApiKey = apiKeyString,
            Name = request.Name,
            IsActive = true,
            CreatedDatetime = DateTime.UtcNow
        };

        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync(cancellationToken);

        return apiKeyString;
    }
}
