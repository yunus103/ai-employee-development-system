using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Contracts.Responses;

namespace BitirmeBackend.Application.Interfaces.Services;

public interface IActionPlanService
{
    /// <summary>
    /// Runs health check → builds EmployeeFeatureDto → calls ML service → saves prediction run,
    /// predicted actions, action plan and items — all inside a single transaction.
    /// Returns 409 if a non-cancelled plan already exists for this assessment.
    /// </summary>
    Task<ActionPlanDetailDto> GenerateDraftActionPlanAsync(GenerateActionPlanRequest request, int requestingUserId);

    Task<ActionPlanDetailDto> GetActionPlanByIdAsync(int id);
    Task<List<ActionPlanDetailDto>> GetEmployeeActionPlansAsync(int employeeId);

    /// <summary>
    /// Updates Title, Description, Priority, DueDate, OrderNo.
    /// If the item was AI-sourced, sets Source = EditedAI.
    /// </summary>
    Task<ActionPlanItemDto> UpdateActionPlanItemAsync(int planId, int itemId, UpdateActionPlanItemRequest request);

    /// <summary>Adds a manual item (Source = Manual, AiPredictedActionId = null).</summary>
    Task<ActionPlanItemDto> AddManualItemAsync(int planId, AddManualActionPlanItemRequest request, int requestingUserId);

    /// <summary>Soft-deletes the item (IsDeleted = true). No separate Status field.</summary>
    Task RemoveItemAsync(int planId, int itemId);

    /// <summary>
    /// Transitions Draft/Edited → Approved. Sets ApprovedAt.
    /// Idempotent: if already Approved or Sent, returns current state (or 409 per documentation).
    /// </summary>
    Task<ActionPlanDetailDto> ApproveActionPlanAsync(int id, int requestingUserId);

    /// <summary>
    /// Transitions Approved → Sent. Creates EmployeeTask for each active item in a transaction.
    /// Idempotent: if already Sent, does NOT create duplicate tasks.
    /// </summary>
    Task<ActionPlanDetailDto> SendActionPlanToEmployeeAsync(int id, int requestingUserId);
}
