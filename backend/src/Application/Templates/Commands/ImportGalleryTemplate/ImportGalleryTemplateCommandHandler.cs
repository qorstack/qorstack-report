using MediatR;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Templates.Commands.UploadTemplate;
using QorstackReportService.Application.Templates.Models;

namespace QorstackReportService.Application.Templates.Commands.ImportGalleryTemplate;

/// <summary>
/// Handler for <see cref="ImportGalleryTemplateCommand"/>. Loads the bundled gallery
/// file and runs it through the existing <see cref="UploadTemplateCommand"/> so the
/// imported template (storage, variables, versioning, sandbox payload) is identical
/// to a user upload.
/// </summary>
public class ImportGalleryTemplateCommandHandler
    : IRequestHandler<ImportGalleryTemplateCommand, TemplateDetailResponse>
{
    private const string DocxContentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private const string XlsxContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IGalleryService _gallery;
    private readonly ISender _sender;

    public ImportGalleryTemplateCommandHandler(IGalleryService gallery, ISender sender)
    {
        _gallery = gallery;
        _sender = sender;
    }

    public async Task<TemplateDetailResponse> Handle(
        ImportGalleryTemplateCommand request, CancellationToken cancellationToken)
    {
        var asset = _gallery.Get(request.GalleryId)
            ?? throw new NotFoundException("GalleryTemplate", request.GalleryId);

        var contentType = asset.FileType.Equals("xlsx", StringComparison.OrdinalIgnoreCase)
            ? XlsxContentType
            : DocxContentType;

        var file = new ByteArrayFormFile(asset.Content, asset.FileName, contentType);

        var command = new UploadTemplateCommand
        {
            UserId = request.UserId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? asset.Name : request.Name,
            File = file,
            ProjectId = request.ProjectId,
            IsAutoGenerateVariables = true,
            SandboxPayload = asset.SampleJson
        };

        return await _sender.Send(command, cancellationToken);
    }
}
