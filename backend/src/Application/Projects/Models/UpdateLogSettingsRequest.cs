using System.ComponentModel.DataAnnotations;

namespace QorstackReportService.Application.Projects.Models;

public class UpdateLogSettingsRequest
{
    public bool LogEnabled { get; set; }

    [Range(0, 3650)]
    public int LogRetentionDays { get; set; }
}
