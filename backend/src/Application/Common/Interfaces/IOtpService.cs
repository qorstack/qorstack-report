using System.Threading;
using System.Threading.Tasks;

namespace QorstackReportService.Application.Common.Interfaces;

public interface IOtpService
{
    Task<string> GenerateOtp(string email, string type, CancellationToken cancellationToken = default);
    Task<string?> VerifyOtp(string email, string otp, string type, CancellationToken cancellationToken = default);
}
