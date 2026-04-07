using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

public partial class MigrationHistory
{
    public int Id { get; set; }

    public string FileName { get; set; } = null!;

    public DateTime AppliedAt { get; set; }

    public string AppliedBy { get; set; } = null!;
}
