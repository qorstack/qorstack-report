namespace QorstackReportService.Application.Reports.Commands.ExportExcel;

public class ExportExcelCommandValidator : AbstractValidator<ExportExcelCommand>
{
    public ExportExcelCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.TemplateKey)
            .NotEmpty()
            .WithMessage("Template key is required");
    }
}
