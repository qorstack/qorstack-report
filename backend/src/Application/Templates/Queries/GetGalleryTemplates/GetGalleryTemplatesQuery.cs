using MediatR;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Templates.Queries.GetGalleryTemplates;

/// <summary>
/// Query to list the curated gallery templates available for import.
/// </summary>
public class GetGalleryTemplatesQuery : IRequest<IReadOnlyList<GalleryTemplateInfo>>
{
}
