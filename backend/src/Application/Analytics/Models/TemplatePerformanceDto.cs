namespace QorstackReportService.Application.Analytics.Models;

public record TemplatePerformanceDto(
    string TemplateKey,
    string TemplateName,
    string ProjectName,
    string Type,
    int TotalGenerations,
    double AvgDurationMs,
    long AvgFileSizeBytes,
    int ErrorCount,
    double SuccessRate,
    double ErrorRate,
    DateTime? LastGeneratedAt);
