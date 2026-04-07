using FluentValidation;

namespace QorstackReportService.Application.Templates.Commands.UpdateTemplate;

/// <summary>
/// Validator for UpdateTemplateCommand
/// </summary>
public class UpdateTemplateCommandValidator : AbstractValidator<UpdateTemplateCommand>
{
    private static readonly string[] ValidStatuses = { "active", "inactive" };

    public UpdateTemplateCommandValidator()
    {
        RuleFor(x => x.TemplateKey)
            .NotEmpty()
            .WithMessage("Template key is required");

        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.Name)
            .MaximumLength(200)
            .WithMessage("Template name must not exceed 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Name));

        RuleFor(x => x.Status)
            .Must(status => ValidStatuses.Contains(status?.ToLowerInvariant()))
            .WithMessage($"Status must be one of: {string.Join(", ", ValidStatuses)}")
            .When(x => !string.IsNullOrEmpty(x.Status));
    }
}
