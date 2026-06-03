using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IEmployeeTaskRepository
{
    Task<(IEnumerable<EmployeeTask> Items, int TotalCount)> GetByEmployeePagedAsync(int employeeId, int pageNumber, int pageSize);
    Task<EmployeeTask?> GetByIdAsync(int id);
    Task<EmployeeTask?> GetByIdWithDetailsAsync(int id);

    /// <summary>
    /// Returns all tasks for the given action plan item (used for idempotency check in Send).
    /// </summary>
    Task<IEnumerable<EmployeeTask>> GetByActionPlanItemIdAsync(int actionPlanItemId);

    Task AddAsync(EmployeeTask task);
    Task AddRangeAsync(IEnumerable<EmployeeTask> tasks);
    void Update(EmployeeTask task);
}
