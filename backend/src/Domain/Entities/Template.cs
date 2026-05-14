using System;
using System.Collections.Generic;
using QorstackReportService.Domain.Common;

namespace QorstackReportService.Domain.Entities;

public partial class Template : BaseAuditableEntity
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid? ProjectId { get; set; }

    /// <summary>
    /// User-defined key for accessing this template via the API.
    /// </summary>
    public string TemplateKey { get; set; } = null!;

    public string Name { get; set; } = null!;

    public virtual Project? Project { get; set; }

    public virtual ICollection<TemplateVersion> TemplateVersions { get; set; } = new List<TemplateVersion>();

    public virtual User User { get; set; } = null!;
}
