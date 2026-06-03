using BitirmeBackend.Domain.Common;

namespace BitirmeBackend.Domain.Entities;

public class Department : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<Employee> Employees { get; set; } = [];
    public ICollection<JobRole> JobRoles { get; set; } = [];
}
