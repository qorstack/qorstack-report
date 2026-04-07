using MediatR;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Templates.Queries.GenerateTemplateKey;

public class GenerateTemplateKeyQuery : IRequest<string>
{
    public Guid UserId { get; set; }
}

public class GenerateTemplateKeyQueryHandler : IRequestHandler<GenerateTemplateKeyQuery, string>
{
    private readonly ITemplateKeyGenerator _keyGenerator;

    public GenerateTemplateKeyQueryHandler(ITemplateKeyGenerator keyGenerator)
    {
        _keyGenerator = keyGenerator;
    }

    public async Task<string> Handle(GenerateTemplateKeyQuery request, CancellationToken cancellationToken)
    {
        return await _keyGenerator.GenerateUniqueTemplateKeyAsync(request.UserId, cancellationToken);
    }
}
