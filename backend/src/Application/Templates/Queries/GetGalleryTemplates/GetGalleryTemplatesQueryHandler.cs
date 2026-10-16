using MediatR;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Templates.Queries.GetGalleryTemplates;

/// <summary>
/// Handler for <see cref="GetGalleryTemplatesQuery"/>.
/// </summary>
public class GetGalleryTemplatesQueryHandler
    : IRequestHandler<GetGalleryTemplatesQuery, IReadOnlyList<GalleryTemplateInfo>>
{
    private readonly IGalleryService _gallery;

    public GetGalleryTemplatesQueryHandler(IGalleryService gallery)
    {
        _gallery = gallery;
    }

    public Task<IReadOnlyList<GalleryTemplateInfo>> Handle(
        GetGalleryTemplatesQuery request, CancellationToken cancellationToken)
        => Task.FromResult(_gallery.List());
}
