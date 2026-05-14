using FluentValidation;

namespace QorstackReportService.Application.Templates.Commands.SwitchTemplateVersion;

/// <summary>
/// Validator for SwitchTemplateVersionCommand
/// </summary>
public class SwitchTemplateVersionCommandValidator : AbstractValidator<SwitchTemplateVersionCommand>
{
    public SwitchTemplateVersionCommandValidator()
    {
        RuleFor(x => x.TemplateKey)
            .NotEmpty()
            .WithMessage("Template key is required");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.Version)
            .NotEmpty()
            .WithMessage("Version is required");
    }
}
