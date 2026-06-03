using BitirmeBackend.Domain.Common;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Domain.Entities;

public class ActionPlanItem : BaseEntity
{
    public int ActionPlanId { get; set; }
    public int? ActionCatalogId { get; set; }
    public int? AiPredictedActionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public PriorityLevel Priority { get; set; } = PriorityLevel.Medium;
    public DateTime? DueDate { get; set; }
    public ActionPlanItemSource Source { get; set; } = ActionPlanItemSource.Manual;
    public int OrderNo { get; set; }

    public ActionPlan ActionPlan { get; set; } = null!;
    public ActionCatalog? ActionCatalog { get; set; }
    public AiPredictedAction? AiPredictedAction { get; set; }
    public ICollection<EmployeeTask> EmployeeTasks { get; set; } = [];
}
