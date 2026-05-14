using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

public partial class ExampleCategory : BaseAuditableEntity
{
    public int CategoryId { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<ExampleProduct> ExampleProducts { get; set; } = new List<ExampleProduct>();
}
