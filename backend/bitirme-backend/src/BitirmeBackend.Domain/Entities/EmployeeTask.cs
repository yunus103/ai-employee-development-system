using BitirmeBackend.Domain.Common;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Domain.Entities;

public class EmployeeTask : BaseEntity
{
    public int ActionPlanItemId { get; set; }
    public int EmployeeId { get; set; }
    public int AssignedByUserId { get; set; }
    public EmployeeTaskStatus Status { get; set; } = EmployeeTaskStatus.Assigned;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ActionPlanItem ActionPlanItem { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
    public User AssignedByUser { get; set; } = null!;
    public ICollection<TaskComment> Comments { get; set; } = [];
}
