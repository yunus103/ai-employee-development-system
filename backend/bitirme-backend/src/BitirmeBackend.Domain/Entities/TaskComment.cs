using BitirmeBackend.Domain.Common;

namespace BitirmeBackend.Domain.Entities;

public class TaskComment : BaseEntity
{
    public int TaskId { get; set; }
    public int UserId { get; set; }
    public string CommentText { get; set; } = string.Empty;

    public EmployeeTask Task { get; set; } = null!;
    public User User { get; set; } = null!;
}
