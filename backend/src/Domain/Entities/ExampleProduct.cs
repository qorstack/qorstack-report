using System;
using System.Collections.Generic;

namespace QorstackReportService.Domain.Entities;

public partial class ExampleProduct : BaseAuditableEntity
{
    public int ProductId { get; set; }

    public string Name { get; set; } = null!;

    public decimal Price { get; set; }

    public int CategoryId { get; set; }

    public virtual ExampleCategory Category { get; set; } = null!;
}
