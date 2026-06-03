using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BitirmeBackend.Api.Controllers;

public class ActionPlansController : BaseController
{
    private readonly IActionPlanService _actionPlanService;
    private readonly IPdfExportService  _pdfExportService;

    public ActionPlansController(IActionPlanService actionPlanService, IPdfExportService pdfExportService)
    {
        _actionPlanService = actionPlanService;
        _pdfExportService  = pdfExportService;
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GenerateActionPlanRequest request)
    {
        var result = await _actionPlanService.GenerateDraftActionPlanAsync(request, CurrentUserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _actionPlanService.GetActionPlanByIdAsync(id);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPut("{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> UpdateItem(int id, int itemId, [FromBody] UpdateActionPlanItemRequest request)
    {
        var result = await _actionPlanService.UpdateActionPlanItemAsync(id, itemId, request);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPost("{id:int}/items")]
    public async Task<IActionResult> AddManualItem(int id, [FromBody] AddManualActionPlanItemRequest request)
    {
        var result = await _actionPlanService.AddManualItemAsync(id, request, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpDelete("{id:int}/items/{itemId:int}")]
    public async Task<IActionResult> RemoveItem(int id, int itemId)
    {
        await _actionPlanService.RemoveItemAsync(id, itemId);
        return NoContent();
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var result = await _actionPlanService.ApproveActionPlanAsync(id, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPost("{id:int}/send")]
    public async Task<IActionResult> Send(int id)
    {
        var result = await _actionPlanService.SendActionPlanToEmployeeAsync(id, CurrentUserId);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpGet("{id:int}/export-pdf")]
    public async Task<IActionResult> ExportPdf(int id)
    {
        var bytes = await _pdfExportService.GenerateActionPlanPdfAsync(id);
        return File(bytes, "application/pdf", $"aksiyon-plani-{id}.pdf");
    }
}
