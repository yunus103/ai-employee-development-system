using BitirmeBackend.Domain.Entities;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IActionPlanRepository
{
    Task<ActionPlan?> GetByIdAsync(int id);
    Task<ActionPlan?> GetByIdWithItemsAsync(int id);
    Task<IEnumerable<ActionPlan>> GetByEmployeeIdAsync(int employeeId);

    /// <summary>Returns an active (non-cancelled) plan for the assessment, if any.</summary>
    Task<ActionPlan?> GetActiveByAssessmentIdAsync(int assessmentId);

    Task<ActionPlanItem?> GetItemByIdAsync(int itemId);

    Task AddAsync(ActionPlan plan);
    Task AddItemAsync(ActionPlanItem item);
    void Update(ActionPlan plan);
    void UpdateItem(ActionPlanItem item);

    /// <summary>Soft-deletes the item by setting IsDeleted = true.</summary>
    void RemoveItem(ActionPlanItem item);
}
