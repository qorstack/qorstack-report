using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Common.Services;

/// <summary>
/// Email Service - handles sending emails.
/// Stateless service, no transaction management needed.
/// </summary>
public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendEmailAsync(string to, string subject, string body)
    {
        // TODO: Implement actual email sending (e.g., SendGrid, SMTP)
        _logger.LogInformation("Sending Email to {To}\nSubject: {Subject}\nBody: {Body}", to, subject, body);
        return Task.CompletedTask;
    }
}
