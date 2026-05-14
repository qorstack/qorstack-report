using System.Threading.Tasks;

namespace QorstackReportService.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body);
}
