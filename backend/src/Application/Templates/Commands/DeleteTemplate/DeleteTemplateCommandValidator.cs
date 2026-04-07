using FluentValidation;

namespace QorstackReportService.Application.Templates.Commands.DeleteTemplate;

/// <summary>
/// Validator for DeleteTemplateCommand
/// </summary>
public class DeleteTemplateCommandValidator : AbstractValidator<DeleteTemplateCommand>
{
    public DeleteTemplateCommandValidator()
    {
        RuleFor(x => x.TemplateKey)
            .NotEmpty()
            .WithMessage("Template key is required");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");
    }
}
