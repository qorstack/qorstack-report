using FluentValidation;

namespace QorstackReportService.Application.Reports.Commands.RenderWithSandboxPayload;

/// <summary>
/// Validator for RenderWithSandboxPayloadCommand
/// </summary>
public class RenderWithSandboxPayloadCommandValidator : AbstractValidator<RenderWithSandboxPayloadCommand>
{
    public RenderWithSandboxPayloadCommandValidator()
    {
        RuleFor(v => v.TemplateKey)
            .NotEmpty().WithMessage("Template key is required");
    }
}
