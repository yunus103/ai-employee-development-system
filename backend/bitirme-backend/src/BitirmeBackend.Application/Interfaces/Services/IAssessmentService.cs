using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Contracts.Responses;

namespace BitirmeBackend.Application.Interfaces.Services;

public interface IAssessmentService
{
    Task<AssessmentDetailDto> GetAssessmentByIdAsync(int id);
    Task<AssessmentDetailDto> CreateAssessmentAsync(CreateAssessmentRequest request, int createdByUserId);
    Task<AssessmentDetailDto> CompleteAssessmentAsync(int id);
    Task<List<AssessmentScoreDto>> GetAssessmentScoresAsync(int assessmentId);
    Task<AssessmentScoreDto> UpsertAssessmentScoreAsync(int assessmentId, UpsertAssessmentScoreRequest request);
    Task<PagedResponse<AssessmentDetailDto>> GetEmployeeAssessmentsAsync(int employeeId, int pageNumber, int pageSize);
}
