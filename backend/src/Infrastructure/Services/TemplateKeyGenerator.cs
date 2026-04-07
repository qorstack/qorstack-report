using Microsoft.EntityFrameworkCore;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Infrastructure.Services;

public class TemplateKeyGenerator : ITemplateKeyGenerator
{
    private readonly IApplicationDbContext _context;

    public TemplateKeyGenerator(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<string> GenerateUniqueTemplateKeyAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        string templateKey;
        do
        {
            templateKey = GenerateTemplateKey();
        }
        while (await _context.Templates.AnyAsync(t => t.UserId == userId && t.TemplateKey == templateKey, cancellationToken));

        return templateKey;
    }

    private static string GenerateTemplateKey()
    {
        var random = new Random();
        return string.Format("QOR-{0:D4}-{1:D3}-{2:D3}-{3:D4}",
            random.Next(10000), // 4 digits
            random.Next(1000),  // 3 digits
            random.Next(1000),  // 3 digits
            random.Next(10000)); // 4 digits
    }
}
