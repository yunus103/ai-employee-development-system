using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BitirmeBackend.Api.Controllers;

[Route("api/tasks")]
public class EmployeeTasksController : BaseController
{
    private readonly IEmployeeTaskService _taskService;

    public EmployeeTasksController(IEmployeeTaskService taskService) =>
        _taskService = taskService;

    /// <summary>Returns the calling employee's task list (paged).</summary>
    [Authorize(Policy = "Authenticated")]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyTasks([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        var empId = CurrentEmployeeId;
        if (empId is null)
            return BadRequest(ApiResponse<object>.Fail("Bu endpoint sadece çalışan rolü için kullanılabilir."));

        if (pageNumber < 1) return BadRequest(ApiResponse<object>.Fail("pageNumber en az 1 olmalıdır."));
        if (pageSize < 1 || pageSize > 100) return BadRequest(ApiResponse<object>.Fail("pageSize 1 ile 100 arasında olmalıdır."));

        var result = await _taskService.GetMyTasksAsync(empId.Value, pageNumber, pageSize);
        return Ok(result);
    }

    /// <summary>Returns detail for any task. Employees can only access their own.</summary>
    [Authorize(Policy = "Authenticated")]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var task = await _taskService.GetTaskDetailAsync(id, CurrentUserId);

        // Employees may only see their own tasks
        if (CurrentUserRole == "Employee")
        {
            var empId = CurrentEmployeeId;
            if (empId is null || int.Parse(task.EmployeeId.ToString()) != empId.Value)
                throw new UnauthorizedAccessException("Bu göreve erişim yetkiniz yok.");
        }

        return Ok(ApiResponse<object>.Ok(task));
    }

    /// <summary>Updates a task's status. Only the owning employee may call this.</summary>
    [Authorize(Policy = "EmployeeOnly")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateEmployeeTaskStatusRequest request)
    {
        var empId = CurrentEmployeeId;
        if (empId is null)
            return BadRequest(ApiResponse<object>.Fail("Bu endpoint sadece çalışan rolü için kullanılabilir."));

        if (!Enum.TryParse<EmployeeTaskStatus>(request.NewStatus, ignoreCase: true, out var newStatus))
            return BadRequest(ApiResponse<object>.Fail($"Geçersiz durum değeri: {request.NewStatus}"));

        var result = await _taskService.UpdateTaskStatusAsync(id, empId.Value, newStatus);
        return Ok(ApiResponse<object>.Ok(result));
    }
}
