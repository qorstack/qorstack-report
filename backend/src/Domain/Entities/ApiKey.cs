using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

public partial class ApiKey : BaseAuditableEntity
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid? ProjectId { get; set; }

    public string XApiKey { get; set; } = null!;

    public string? Name { get; set; }

    public bool? IsActive { get; set; }

    public virtual Project? Project { get; set; }

    public virtual ICollection<ReportJob> ReportJobs { get; set; } = new List<ReportJob>();

    public virtual User User { get; set; } = null!;
}
