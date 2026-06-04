using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Responses;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Application.Services;

public class EmployeeTaskService : IEmployeeTaskService
{
    private readonly IEmployeeTaskRepository _tasks;
    private readonly IActionPlanRepository _actionPlans;
    private readonly IUnitOfWork _uow;

    public EmployeeTaskService(IEmployeeTaskRepository tasks, IActionPlanRepository actionPlans, IUnitOfWork uow)
    {
        _tasks = tasks;
        _actionPlans = actionPlans;
        _uow   = uow;
    }

    public async Task<PagedResponse<EmployeeTaskDto>> GetMyTasksAsync(int employeeId, int pageNumber, int pageSize)
    {
        var (items, total) = await _tasks.GetByEmployeePagedAsync(employeeId, pageNumber, pageSize);

        // Enrich each task with nav properties
        var dtos = new List<EmployeeTaskDto>();
        foreach (var t in items)
        {
            var detailed = await _tasks.GetByIdWithDetailsAsync(t.Id);
            if (detailed is not null)
                dtos.Add(ToDto(detailed));
        }

        return PagedResponse<EmployeeTaskDto>.Ok(dtos, total, pageNumber, pageSize);
    }

    public async Task<EmployeeTaskDto> GetTaskDetailAsync(int taskId, int requestingUserId)
    {
        var task = await _tasks.GetByIdWithDetailsAsync(taskId)
            ?? throw new KeyNotFoundException($"Görev bulunamadı: {taskId}");

        return ToDto(task);
    }

    public async Task<EmployeeTaskDto> UpdateTaskStatusAsync(int taskId, int employeeId, EmployeeTaskStatus newStatus)
    {
        var task = await _tasks.GetByIdWithDetailsAsync(taskId)
            ?? throw new KeyNotFoundException($"Görev bulunamadı: {taskId}");

        if (task.EmployeeId != employeeId)
            throw new UnauthorizedAccessException("Bu göreve erişim yetkiniz yok.");

        // Validate transition
        var current = task.Status;
        var valid = (current, newStatus) switch
        {
            (EmployeeTaskStatus.Assigned,   EmployeeTaskStatus.InProgress)  => true,
            (EmployeeTaskStatus.InProgress, EmployeeTaskStatus.Completed)   => true,
            (EmployeeTaskStatus.Assigned,   EmployeeTaskStatus.Cancelled)   => true,
            _ => false
        };

        if (!valid)
            throw new ArgumentException($"Geçersiz durum geçişi: {current} → {newStatus}");

        task.Status = newStatus;

        if (newStatus == EmployeeTaskStatus.Completed)
            task.CompletedAt = DateTime.UtcNow;
        else
            task.CompletedAt = null;

        task.UpdatedAt = DateTime.UtcNow;
        _tasks.Update(task);
        await _uow.SaveChangesAsync();

        if (newStatus == EmployeeTaskStatus.Completed && task.ActionPlanItem != null)
        {
            var planId = task.ActionPlanItem.ActionPlanId;
            var plan = await _actionPlans.GetByIdWithItemsAsync(planId);
            if (plan != null)
            {
                var activeItems = plan.Items.Where(i => !i.IsDeleted).ToList();
                bool allCompleted = true;
                foreach (var pi in activeItems)
                {
                    var planItemTasks = await _tasks.GetByActionPlanItemIdAsync(pi.Id);
                    var t = planItemTasks.FirstOrDefault();
                    if (t == null || t.Status != EmployeeTaskStatus.Completed)
                    {
                        allCompleted = false;
                        break;
                    }
                }

                if (allCompleted)
                {
                    plan.Status = ActionPlanStatus.Completed;
                    plan.UpdatedAt = DateTime.UtcNow;
                    _actionPlans.Update(plan);
                    await _uow.SaveChangesAsync();
                }
            }
        }

        return ToDto(task);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static EmployeeTaskDto ToDto(Domain.Entities.EmployeeTask t) => new()
    {
        Id                  = t.Id,
        ActionPlanItemId    = t.ActionPlanItemId,
        Title               = t.ActionPlanItem?.Title       ?? string.Empty,
        Description         = t.ActionPlanItem?.Description ?? string.Empty,
        Priority            = t.ActionPlanItem?.Priority.ToString() ?? string.Empty,
        EmployeeId          = t.EmployeeId,
        EmployeeName        = t.Employee?.FullName           ?? string.Empty,
        AssignedByUserId    = t.AssignedByUserId,
        AssignedByUserName  = t.AssignedByUser?.FullName     ?? string.Empty,
        Status              = t.Status.ToString(),
        AssignedAt          = t.AssignedAt,
        DueDate             = t.DueDate,
        CompletedAt         = t.CompletedAt
    };
}
