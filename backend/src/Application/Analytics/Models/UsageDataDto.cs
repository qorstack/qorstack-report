namespace QorstackReportService.Application.Analytics.Models;

public record UsageDataDto(
    string Range,
    string GroupBy,
    int TotalVolume,
    List<UsageDataPointDto> Data);

public record UsageDataPointDto(
    string Date,
    int Count,
    Dictionary<string, int> Breakdown);
