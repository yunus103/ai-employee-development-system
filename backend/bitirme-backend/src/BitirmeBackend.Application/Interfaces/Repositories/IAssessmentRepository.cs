using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IAssessmentRepository
{
    Task<Assessment?> GetByIdAsync(int id);
    Task<Assessment?> GetByIdWithDetailsAsync(int id);
    Task<(IEnumerable<Assessment> Items, int TotalCount)> GetByEmployeePagedAsync(int employeeId, int pageNumber, int pageSize);
    Task<IEnumerable<AssessmentScore>> GetScoresByAssessmentIdAsync(int assessmentId);
    Task<AssessmentScore?> GetScoreAsync(int assessmentId, int competencyId, string evaluatorType);
    Task AddAsync(Assessment assessment);
    Task AddScoreAsync(AssessmentScore score);
    void Update(Assessment assessment);
    void UpdateScore(AssessmentScore score);
}
