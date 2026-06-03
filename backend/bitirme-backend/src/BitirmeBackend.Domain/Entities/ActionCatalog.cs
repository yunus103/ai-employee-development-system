using BitirmeBackend.Domain.Common;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Domain.Entities;

public class ActionCatalog : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Category { get; set; }
    public PriorityLevel DefaultPriority { get; set; } = PriorityLevel.Medium;
    public int? EstimatedDurationDays { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<ActionPlanItem> ActionPlanItems { get; set; } = [];
}
