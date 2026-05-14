namespace QorstackReportService.Application.Analytics.Models;

public record ContributionDataDto(
    int TotalContributions,
    double GrowthPercent,
    BusiestDayDto BusiestDay,
    int ActiveDays,
    List<DailyContributionDto> DailyData);

public record BusiestDayDto(string Date, int Count);

public record DailyContributionDto(string Date, int Count);
