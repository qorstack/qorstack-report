namespace QorstackReportService.Domain.Enums;

/// <summary>
/// Status enum for SLA processing
/// S = Success, P = Pause, R = Running, C = Cancel
/// </summary>
public enum SlaStatus
{
    Success = 'S',
    Pause = 'P',
    Running = 'R',
    Cancel = 'C'
}
