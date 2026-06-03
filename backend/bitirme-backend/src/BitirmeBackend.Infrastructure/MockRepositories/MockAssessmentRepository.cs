using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockAssessmentRepository : IAssessmentRepository
{
    private static IEnumerable<Assessment> Active =>
        MockDataStore.Assessments.Where(a => !a.IsDeleted);

    public Task<Assessment?> GetByIdAsync(int id) =>
        Task.FromResult(Active.FirstOrDefault(a => a.Id == id));

    public Task<Assessment?> GetByIdWithDetailsAsync(int id)
    {
        var a = Active.FirstOrDefault(x => x.Id == id);
        if (a is not null)
        {
            a.Employee       = MockDataStore.Employees.FirstOrDefault(e => e.Id == a.EmployeeId)!;
            a.Cycle          = MockDataStore.AssessmentCycles.FirstOrDefault(c => c.Id == a.CycleId)!;
            a.CreatedByUser  = MockDataStore.Users.FirstOrDefault(u => u.Id == a.CreatedByUserId)!;
            a.Scores         = MockDataStore.AssessmentScores.Where(s => s.AssessmentId == a.Id).ToList();
        }
        return Task.FromResult(a);
    }

    public Task<(IEnumerable<Assessment> Items, int TotalCount)> GetByEmployeePagedAsync(
        int employeeId, int pageNumber, int pageSize)
    {
        var all = Active.Where(a => a.EmployeeId == employeeId).ToList();
        var items = all.Skip((pageNumber - 1) * pageSize).Take(pageSize);
        return Task.FromResult((items, all.Count));
    }

    public Task<IEnumerable<AssessmentScore>> GetScoresByAssessmentIdAsync(int assessmentId)
    {
        var scores = MockDataStore.AssessmentScores
            .Where(s => s.AssessmentId == assessmentId && !s.IsDeleted)
            .ToList();

        // Attach competency navigation
        foreach (var s in scores)
            s.Competency = MockDataStore.Competencies.FirstOrDefault(c => c.Id == s.CompetencyId)!;

        return Task.FromResult<IEnumerable<AssessmentScore>>(scores);
    }

    public Task<AssessmentScore?> GetScoreAsync(int assessmentId, int competencyId, string evaluatorType) =>
        Task.FromResult(MockDataStore.AssessmentScores.FirstOrDefault(s =>
            s.AssessmentId == assessmentId &&
            s.CompetencyId == competencyId &&
            s.EvaluatorType.ToString() == evaluatorType &&
            !s.IsDeleted));

    public Task AddAsync(Assessment assessment)
    {
        assessment.Id = MockDataStore.NextAssessmentId++;
        assessment.CreatedAt = DateTime.UtcNow;
        MockDataStore.Assessments.Add(assessment);
        return Task.CompletedTask;
    }

    public Task AddScoreAsync(AssessmentScore score)
    {
        score.Id = MockDataStore.NextAssessmentScoreId++;
        score.CreatedAt = DateTime.UtcNow;
        MockDataStore.AssessmentScores.Add(score);
        return Task.CompletedTask;
    }

    public void Update(Assessment assessment) => assessment.UpdatedAt = DateTime.UtcNow;
    public void UpdateScore(AssessmentScore score) => score.UpdatedAt = DateTime.UtcNow;
}
