using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

public partial class Client : BaseAuditableEntity
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Status { get; set; }

}
