using System;

namespace QorstackReportService.Application.Analytics.Models;

public record GenerationDto(
    Guid Id,
    string? TemplateName,
    string? TemplateKey,
    string? Type,
    string Status,
    DateTime? CreatedDatetime,
    long? DurationMs,
    long? FileSizeBytes,
    string? ErrorMessage,
    string? DownloadUrl);
