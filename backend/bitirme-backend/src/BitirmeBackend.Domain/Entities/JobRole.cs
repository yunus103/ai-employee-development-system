using BitirmeBackend.Domain.Common;

namespace BitirmeBackend.Domain.Entities;

public class JobRole : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }
    public string? Description { get; set; }

    public Department? Department { get; set; }
    public ICollection<Employee> Employees { get; set; } = [];
}
