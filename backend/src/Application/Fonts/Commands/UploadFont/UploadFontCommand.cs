using MediatR;
using Microsoft.AspNetCore.Http;
using QorstackReportService.Application.Fonts.Models;

namespace QorstackReportService.Application.Fonts.Commands.UploadFont;

public class UploadFontCommand : IRequest<FontDetailDto>
{
    public required Guid UserId { get; set; }
    public required IFormFile File { get; set; }
    public string? LicenseNote { get; set; }
}
