using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockEmployeeTaskRepository : IEmployeeTaskRepository
{
    private static IEnumerable<EmployeeTask> Active =>
        MockDataStore.EmployeeTasks.Where(t => !t.IsDeleted);

    public Task<(IEnumerable<EmployeeTask> Items, int TotalCount)> GetByEmployeePagedAsync(
        int employeeId, int pageNumber, int pageSize)
    {
        var all = Active.Where(t => t.EmployeeId == employeeId).ToList();
        var items = all.Skip((pageNumber - 1) * pageSize).Take(pageSize);
        return Task.FromResult((items, all.Count));
    }

    public Task<EmployeeTask?> GetByIdAsync(int id) =>
        Task.FromResult(Active.FirstOrDefault(t => t.Id == id));

    public Task<EmployeeTask?> GetByIdWithDetailsAsync(int id)
    {
        var task = Active.FirstOrDefault(t => t.Id == id);
        if (task is not null)
        {
            task.Employee        = MockDataStore.Employees.FirstOrDefault(e => e.Id == task.EmployeeId)!;
            task.AssignedByUser  = MockDataStore.Users.FirstOrDefault(u => u.Id == task.AssignedByUserId)!;
            task.ActionPlanItem  = MockDataStore.ActionPlanItems.FirstOrDefault(i => i.Id == task.ActionPlanItemId)!;
        }
        return Task.FromResult(task);
    }

    public Task<IEnumerable<EmployeeTask>> GetByActionPlanItemIdAsync(int actionPlanItemId) =>
        Task.FromResult(Active.Where(t => t.ActionPlanItemId == actionPlanItemId));

    public Task AddAsync(EmployeeTask task)
    {
        task.Id = MockDataStore.NextEmployeeTaskId++;
        task.CreatedAt = DateTime.UtcNow;
        MockDataStore.EmployeeTasks.Add(task);
        return Task.CompletedTask;
    }

    public Task AddRangeAsync(IEnumerable<EmployeeTask> tasks)
    {
        foreach (var t in tasks)
        {
            t.Id = MockDataStore.NextEmployeeTaskId++;
            t.CreatedAt = DateTime.UtcNow;
            MockDataStore.EmployeeTasks.Add(t);
        }
        return Task.CompletedTask;
    }

    public void Update(EmployeeTask task) => task.UpdatedAt = DateTime.UtcNow;
}
