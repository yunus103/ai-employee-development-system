using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BitirmeBackend.Api.Controllers;

public class EmployeesController : BaseController
{
    private readonly IEmployeeService _employeeService;
    private readonly IAssessmentService _assessmentService;
    private readonly IActionPlanService _actionPlanService;

    public EmployeesController(IEmployeeService employeeService, IAssessmentService assessmentService, IActionPlanService actionPlanService)
    {
        _employeeService = employeeService;
        _assessmentService = assessmentService;
        _actionPlanService = actionPlanService;
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        if (pageNumber < 1) return BadRequest(ApiResponse<object>.Fail("pageNumber en az 1 olmalıdır."));
        if (pageSize < 1 || pageSize > 100) return BadRequest(ApiResponse<object>.Fail("pageSize 1 ile 100 arasında olmalıdır."));

        var result = await _employeeService.GetEmployeesAsync(pageNumber, pageSize);

        if (CurrentUserRole == "Manager")
        {
            var myEmpId = CurrentEmployeeId;
            var filtered = result.Data.Where(e => e.ManagerId == myEmpId).ToList();
            return Ok(PagedResponse<object>.Ok(filtered.Cast<object>(), filtered.Count, pageNumber, pageSize));
        }

        return Ok(result);
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var emp = await _employeeService.GetEmployeeByIdAsync(id);

        if (CurrentUserRole == "Manager" && emp.ManagerId != CurrentEmployeeId)
            throw new UnauthorizedAccessException("Bu çalışana erişim yetkiniz yok.");

        return Ok(ApiResponse<object>.Ok(emp));
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeRequest request)
    {
        var result = await _employeeService.CreateEmployeeAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEmployeeRequest request)
    {
        var result = await _employeeService.UpdateEmployeeAsync(id, request);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpGet("{id:int}/assessments")]
    public async Task<IActionResult> GetAssessments(int id,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        if (pageNumber < 1) return BadRequest(ApiResponse<object>.Fail("pageNumber en az 1 olmalıdır."));
        if (pageSize < 1 || pageSize > 100) return BadRequest(ApiResponse<object>.Fail("pageSize 1 ile 100 arasında olmalıdır."));

        var result = await _assessmentService.GetEmployeeAssessmentsAsync(id, pageNumber, pageSize);
        return Ok(result);
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpGet("{id:int}/action-plans")]
    public async Task<IActionResult> GetActionPlans(int id)
    {
        var result = await _actionPlanService.GetEmployeeActionPlansAsync(id);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpGet("{id:int}/features")]
    public async Task<IActionResult> GetFeatures(int id, [FromQuery] int assessmentId)
    {
        try
        {
            var features = await _employeeService.GetEmployeeFeaturesForPredictionAsync(id, assessmentId);
            return Ok(ApiResponse<object>.Ok(features));
        }
        catch (ArgumentException ex)
        {
            var missingList = ex.Message
                .Replace("Eksik özellikler: ", string.Empty)
                .Split(", ", StringSplitOptions.RemoveEmptyEntries);

            return BadRequest(new
            {
                success = false,
                message = ex.Message,
                missingFeatures = missingList
            });
        }
    }
}
