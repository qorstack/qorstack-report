using MediatR;

namespace QorstackReportService.Application.Templates.Commands.DeleteTemplate;

/// <summary>
/// Command to delete a template
/// </summary>
public class DeleteTemplateCommand : IRequest<Unit>
{
    /// <summary>
    /// Template key to delete
    /// </summary>
    public required string TemplateKey { get; set; }

    /// <summary>
    /// User ID (from authenticated API key)
    /// </summary>
    public Guid UserId { get; set; }
}
