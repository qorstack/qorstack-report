namespace QorstackReportService.Application.Projects.Models;

public class LogSettingsDto
{
    public bool LogEnabled { get; set; }
    public int LogRetentionDays { get; set; }
}
