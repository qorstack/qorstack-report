using MediatR;

namespace QorstackReportService.Application.Templates.Commands.SwitchTemplateVersion;

/// <summary>
/// Command to switch active version of a template
/// </summary>
public class SwitchTemplateVersionCommand : IRequest<Unit>
{
    /// <summary>
    /// Template key
    /// </summary>
    public required string TemplateKey { get; set; }

    /// <summary>
    /// User ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Version number to activate
    /// </summary>
    public int? Version { get; set; }
}
