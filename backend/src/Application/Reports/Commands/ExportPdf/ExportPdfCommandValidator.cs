namespace QorstackReportService.Application.Reports.Commands.ExportPdf;

using System.Linq;

/// <summary>
/// Validator for ExportPdfCommand
/// </summary>
public class ExportPdfCommandValidator : AbstractValidator<ExportPdfCommand>
{
    private static readonly string[] ValidReturnTypes = { "stream", "url" };

    public ExportPdfCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.TemplateKey)
            .NotEmpty()
            .WithMessage("Template key is required");
    }
}
