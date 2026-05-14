namespace QorstackReportService.Application.Common.Interfaces;

public interface ITemplateKeyGenerator
{
    Task<string> GenerateUniqueTemplateKeyAsync(Guid userId, CancellationToken cancellationToken = default);
}
