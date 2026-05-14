using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace QorstackReportService.Domain.Common;

public abstract class BaseAuditableEntity : BaseEntity
{
    [Column("created_datetime")]
    public DateTime? CreatedDatetime { get; set; }

    [Column("created_by")]
    public string? CreatedBy { get; set; }

    [Column("updated_datetime")]
    public DateTime? UpdatedDatetime { get; set; }

    [Column("updated_by")]
    public string? UpdatedBy { get; set; }
}
