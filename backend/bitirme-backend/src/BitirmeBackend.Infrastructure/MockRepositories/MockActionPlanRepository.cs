using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockActionPlanRepository : IActionPlanRepository
{
    private static IEnumerable<ActionPlan> Active =>
        MockDataStore.ActionPlans.Where(p => !p.IsDeleted);

    public Task<ActionPlan?> GetByIdAsync(int id) =>
        Task.FromResult(Active.FirstOrDefault(p => p.Id == id));

    public Task<ActionPlan?> GetByIdWithItemsAsync(int id)
    {
        var plan = Active.FirstOrDefault(p => p.Id == id);
        if (plan is not null)
        {
            plan.Employee       = MockDataStore.Employees.FirstOrDefault(e => e.Id == plan.EmployeeId)!;
            plan.CreatedByUser  = MockDataStore.Users.FirstOrDefault(u => u.Id == plan.CreatedByUserId)!;
            // Items: only non-deleted ones
            plan.Items = MockDataStore.ActionPlanItems
                .Where(i => i.ActionPlanId == plan.Id && !i.IsDeleted)
                .ToList();
        }
        return Task.FromResult(plan);
    }

    public Task<IEnumerable<ActionPlan>> GetByEmployeeIdAsync(int employeeId) =>
        Task.FromResult(Active.Where(p => p.EmployeeId == employeeId));

    public Task<ActionPlan?> GetActiveByAssessmentIdAsync(int assessmentId)
    {
        // Returns any plan that is NOT cancelled (i.e. Draft, Edited, Approved, Sent, Completed)
        var plan = Active.FirstOrDefault(p =>
            p.AssessmentId == assessmentId && p.Status != ActionPlanStatus.Cancelled);
        return Task.FromResult(plan);
    }

    public Task<ActionPlanItem?> GetItemByIdAsync(int itemId) =>
        Task.FromResult(MockDataStore.ActionPlanItems.FirstOrDefault(i => i.Id == itemId && !i.IsDeleted));

    public Task AddAsync(ActionPlan plan)
    {
        plan.Id = MockDataStore.NextActionPlanId++;
        plan.CreatedAt = DateTime.UtcNow;
        MockDataStore.ActionPlans.Add(plan);
        return Task.CompletedTask;
    }

    public Task AddItemAsync(ActionPlanItem item)
    {
        item.Id = MockDataStore.NextActionPlanItemId++;
        item.CreatedAt = DateTime.UtcNow;
        MockDataStore.ActionPlanItems.Add(item);
        return Task.CompletedTask;
    }

    public void Update(ActionPlan plan) => plan.UpdatedAt = DateTime.UtcNow;
    public void UpdateItem(ActionPlanItem item) => item.UpdatedAt = DateTime.UtcNow;

    /// <summary>Soft delete — sets IsDeleted = true.</summary>
    public void RemoveItem(ActionPlanItem item)
    {
        item.IsDeleted = true;
        item.UpdatedAt = DateTime.UtcNow;
    }
}
