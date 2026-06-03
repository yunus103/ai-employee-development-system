using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Responses;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Application.Interfaces.Services;

public interface IEmployeeTaskService
{
    Task<PagedResponse<EmployeeTaskDto>> GetMyTasksAsync(int employeeId, int pageNumber, int pageSize);

    /// <summary>
    /// Valid transitions: Assigned→InProgress, InProgress→Completed, Assigned→Cancelled.
    /// Sets CompletedAt when transitioning to Completed.
    /// Throws if the task does not belong to employeeId.
    /// </summary>
    Task<EmployeeTaskDto> UpdateTaskStatusAsync(int taskId, int employeeId, EmployeeTaskStatus newStatus);

    /// <summary>
    /// Returns task detail. HR/Manager/Admin may request any task; Employee only their own.
    /// Authorization enforcement is the caller's responsibility via requestingUserId.
    /// </summary>
    Task<EmployeeTaskDto> GetTaskDetailAsync(int taskId, int requestingUserId);
}
