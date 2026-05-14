using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

public partial class FontOwnership
{
    public Guid Id { get; set; }

    public Guid FontId { get; set; }

    public Guid ProjectId { get; set; }

    public Guid UploadedByUserId { get; set; }

    public string? LicenseNote { get; set; }

    public bool IsActive { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime CreatedDatetime { get; set; }

    public virtual Font Font { get; set; } = null!;

    public virtual Project Project { get; set; } = null!;

    public virtual User UploadedByUser { get; set; } = null!;
}
