using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BitirmeBackend.Api.Controllers;

public class AssessmentsController : BaseController
{
    private readonly IAssessmentService _assessmentService;

    public AssessmentsController(IAssessmentService assessmentService) =>
        _assessmentService = assessmentService;

    [Authorize(Policy = "HrOrManager")]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _assessmentService.GetAssessmentByIdAsync(id);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAssessmentRequest request)
    {
        var result = await _assessmentService.CreateAssessmentAsync(request, CurrentUserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPut("{id:int}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        var result = await _assessmentService.CompleteAssessmentAsync(id);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpGet("{id:int}/scores")]
    public async Task<IActionResult> GetScores(int id)
    {
        var scores = await _assessmentService.GetAssessmentScoresAsync(id);
        return Ok(ApiResponse<object>.Ok(scores));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPost("{id:int}/scores")]
    public async Task<IActionResult> UpsertScore(int id, [FromBody] UpsertAssessmentScoreRequest request)
    {
        var result = await _assessmentService.UpsertAssessmentScoreAsync(id, request);
        return Ok(ApiResponse<object>.Ok(result));
    }

    [Authorize(Policy = "HrOrManager")]
    [HttpPut("{id:int}/scores/{scoreId:int}")]
    public async Task<IActionResult> UpdateScore(int id, int scoreId, [FromBody] UpsertAssessmentScoreRequest request)
    {
        // Validate range before calling service (scoreId is used only for routing; service updates by assessmentId+competencyId+evaluatorType)
        if (request.Score < 0.0 || request.Score > 5.0)
            return BadRequest(ApiResponse<object>.Fail($"Skor 0 ile 5 arasında olmalıdır. Girilen değer: {request.Score}"));

        var result = await _assessmentService.UpsertAssessmentScoreAsync(id, request);
        return Ok(ApiResponse<object>.Ok(result));
    }
}
