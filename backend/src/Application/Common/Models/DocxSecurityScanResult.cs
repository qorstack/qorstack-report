namespace QorstackReportService.Application.Common.Models;

public class DocxSecurityScanResult
{
    public bool IsSafe { get; set; }
    public List<string> Threats { get; set; } = new();
}
