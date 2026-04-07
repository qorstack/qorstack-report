using FluentValidation;

namespace QorstackReportService.Application.Templates.Commands.UploadTemplate;

/// <summary>
/// Validator for UploadTemplateCommand
/// </summary>
public class UploadTemplateCommandValidator : AbstractValidator<UploadTemplateCommand>
{
    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB
    private static readonly string[] AllowedExtensions = { ".docx", ".xlsx" };
    private static readonly string[] AllowedContentTypes =
    {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    public UploadTemplateCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("User ID is required");

        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Template name is required")
            .MaximumLength(200)
            .WithMessage("Template name must not exceed 200 characters");

        RuleFor(x => x.File)
            .NotNull()
            .WithMessage("Template file is required")
            .Must(file => file != null && file.Length > 0)
            .WithMessage("Template file cannot be empty")
            .Must(file => file != null && file.Length <= MaxFileSizeBytes)
            .WithMessage($"Template file size must not exceed {MaxFileSizeBytes / (1024 * 1024)} MB")
            .Must(file => file != null && HasValidExtension(file.FileName))
            .WithMessage($"Only {string.Join(", ", AllowedExtensions)} files are allowed")
            .Must(file => file != null && HasValidContentType(file.ContentType))
            .WithMessage("Invalid file content type. Only Word (.docx) and Excel (.xlsx) documents are allowed");
    }

    private static bool HasValidExtension(string fileName)
    {
        if (string.IsNullOrEmpty(fileName))
            return false;

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return AllowedExtensions.Contains(extension);
    }

    private static bool HasValidContentType(string contentType)
    {
        if (string.IsNullOrEmpty(contentType))
            return false;

        return AllowedContentTypes.Contains(contentType.ToLowerInvariant());
    }
}
