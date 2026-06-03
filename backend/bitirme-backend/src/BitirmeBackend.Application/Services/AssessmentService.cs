using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Contracts.Responses;
using BitirmeBackend.Domain.Entities;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Application.Services;

public class AssessmentService : IAssessmentService
{
    private readonly IAssessmentRepository _assessments;

    public AssessmentService(IAssessmentRepository assessments)
    {
        _assessments = assessments;
    }

    public async Task<AssessmentDetailDto> GetAssessmentByIdAsync(int id)
    {
        var a = await _assessments.GetByIdWithDetailsAsync(id)
            ?? throw new KeyNotFoundException($"Değerlendirme bulunamadı: {id}");
        return ToDetail(a);
    }

    public async Task<AssessmentDetailDto> CreateAssessmentAsync(CreateAssessmentRequest request, int createdByUserId)
    {
        var assessment = new Assessment
        {
            EmployeeId      = request.EmployeeId,
            CycleId         = request.CycleId,
            Status          = AssessmentStatus.Draft,
            CreatedByUserId = createdByUserId
        };

        await _assessments.AddAsync(assessment);

        var created = await _assessments.GetByIdWithDetailsAsync(assessment.Id)
            ?? throw new InvalidOperationException("Oluşturulan değerlendirme yüklenemedi.");
        return ToDetail(created);
    }

    public async Task<AssessmentDetailDto> CompleteAssessmentAsync(int id)
    {
        var a = await _assessments.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Değerlendirme bulunamadı: {id}");

        if (a.Status != AssessmentStatus.Draft)
            throw new ArgumentException($"Yalnızca Draft durumundaki değerlendirmeler tamamlanabilir. Mevcut durum: {a.Status}");

        a.Status    = AssessmentStatus.Completed;
        a.UpdatedAt = DateTime.UtcNow;
        _assessments.Update(a);

        var updated = await _assessments.GetByIdWithDetailsAsync(id)
            ?? throw new InvalidOperationException("Güncellenen değerlendirme yüklenemedi.");
        return ToDetail(updated);
    }

    public async Task<List<AssessmentScoreDto>> GetAssessmentScoresAsync(int assessmentId)
    {
        var scores = await _assessments.GetScoresByAssessmentIdAsync(assessmentId);
        return scores.Select(ToScoreDto).ToList();
    }

    public async Task<AssessmentScoreDto> UpsertAssessmentScoreAsync(int assessmentId, UpsertAssessmentScoreRequest request)
    {
        if (request.Score < 0.0 || request.Score > 5.0)
            throw new ArgumentException($"Skor 0 ile 5 arasında olmalıdır. Girilen değer: {request.Score}");

        var existing = await _assessments.GetScoreAsync(assessmentId, request.CompetencyId, request.EvaluatorType);

        if (existing is not null)
        {
            existing.Score     = request.Score;
            existing.UpdatedAt = DateTime.UtcNow;
            _assessments.UpdateScore(existing);

            // Reload with competency nav attached
            var allScores = await _assessments.GetScoresByAssessmentIdAsync(assessmentId);
            var refreshed = allScores.FirstOrDefault(s => s.Id == existing.Id) ?? existing;
            return ToScoreDto(refreshed);
        }

        if (!Enum.TryParse<EvaluatorType>(request.EvaluatorType, ignoreCase: true, out var evalType))
            throw new ArgumentException($"Geçersiz EvaluatorType: {request.EvaluatorType}");

        var score = new AssessmentScore
        {
            AssessmentId  = assessmentId,
            CompetencyId  = request.CompetencyId,
            EvaluatorType = evalType,
            Score         = request.Score
        };

        await _assessments.AddScoreAsync(score);

        // Reload with competency nav attached via GetScoresByAssessmentId
        var scores = await _assessments.GetScoresByAssessmentIdAsync(assessmentId);
        var saved  = scores.FirstOrDefault(s => s.Id == score.Id) ?? score;
        return ToScoreDto(saved);
    }

    public async Task<PagedResponse<AssessmentDetailDto>> GetEmployeeAssessmentsAsync(
        int employeeId, int pageNumber, int pageSize)
    {
        var (items, total) = await _assessments.GetByEmployeePagedAsync(employeeId, pageNumber, pageSize);

        // Load details for each (attach nav properties)
        var dtos = new List<AssessmentDetailDto>();
        foreach (var a in items)
        {
            var detailed = await _assessments.GetByIdWithDetailsAsync(a.Id);
            if (detailed is not null) dtos.Add(ToDetail(detailed));
        }

        return PagedResponse<AssessmentDetailDto>.Ok(dtos, total, pageNumber, pageSize);
    }

    // ── Mapping helpers ──────────────────────────────────────────────────────

    private static AssessmentDetailDto ToDetail(Assessment a) => new()
    {
        Id                = a.Id,
        EmployeeId        = a.EmployeeId,
        EmployeeName      = a.Employee?.FullName ?? string.Empty,
        CycleId           = a.CycleId,
        CycleName         = a.Cycle?.Name ?? string.Empty,
        OverallScore      = a.OverallScore,
        Status            = a.Status.ToString(),
        CreatedByUserId   = a.CreatedByUserId,
        CreatedByUserName = a.CreatedByUser?.FullName ?? string.Empty,
        CreatedAt         = a.CreatedAt,
        UpdatedAt         = a.UpdatedAt
    };

    private static AssessmentScoreDto ToScoreDto(AssessmentScore s) => new()
    {
        Id             = s.Id,
        AssessmentId   = s.AssessmentId,
        CompetencyId   = s.CompetencyId,
        CompetencyCode = s.Competency?.Code ?? string.Empty,
        CompetencyName = s.Competency?.Name ?? string.Empty,
        EvaluatorType  = s.EvaluatorType.ToString(),
        Score          = s.Score
    };
}
