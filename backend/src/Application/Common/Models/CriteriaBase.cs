namespace QorstackReportService.Application.Common.Models;
public abstract record CriteriaBase
{
    public SortDirection? Direction { get; set; } = SortDirection.Ascending;
    public string? SortPath { get; set; }
    public int PageSize { get; set; } = 10;
    public int PageNumber { get; set; } = 1;
}

public enum SortDirection
{
    Ascending = 0,
    Descending = 1
}
