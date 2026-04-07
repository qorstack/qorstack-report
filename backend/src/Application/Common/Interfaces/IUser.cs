namespace QorstackReportService.Application.Common.Interfaces;

public interface IUser
{
    string? Id { get; }
    string? Name { get; }
    string? Email { get; }
    string? Role { get; }
    string? AppId { get; }
}
