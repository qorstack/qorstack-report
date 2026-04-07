using System;

namespace QorstackReportService.Application.Projects.Models;

public record ProjectDto(Guid Id, string Name, string? Description, string? Status, DateTime? CreatedDatetime);
