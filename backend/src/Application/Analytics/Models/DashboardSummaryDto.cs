namespace QorstackReportService.Application.Analytics.Models;

public record DashboardSummaryDto(
    int TotalGenerated,
    int[] TotalGeneratedTrend,
    int ActiveProjects,
    int MaxProjects,
    double SuccessRate,
    double[] SuccessRateTrend,
    int TotalTemplates,
    List<TemplateBreakdownDto> TemplateBreakdown,
    int CreditBalance,
    int CreditLimit);

public record TemplateBreakdownDto(string Type, int Count);
