using System;

namespace QorstackReportService.Application.Settings.Models;

public record ProfileDto(Guid Id, string Email, string? FirstName, string? LastName, string? ProfileImageUrl, int CreditBalance);
