namespace QorstackReportService.Application.Reports.Commands.ExportExcel;

public class ExportExcelCommandValidator : AbstractValidator<ExportExcelCommand>
{
    private static readonly string[] ValidFileTypes = ["xlsx", "pdf"];

    public ExportExcelCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.TemplateKey)
            .NotEmpty()
            .WithMessage("Template key is required");

        RuleFor(x => x.FileType)
            .Must(f => ValidFileTypes.Contains(f.ToLowerInvariant()))
            .WithMessage("File type must be 'xlsx' or 'pdf'");
    }
}
