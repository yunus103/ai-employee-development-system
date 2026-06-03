using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockAiPredictionRepository : IAiPredictionRepository
{
    public Task<AiPredictionRun?> GetByIdAsync(int id) =>
        Task.FromResult(MockDataStore.AiPredictionRuns.FirstOrDefault(r => r.Id == id && !r.IsDeleted));

    public Task<AiPredictionRun?> GetByIdWithActionsAsync(int id)
    {
        var run = MockDataStore.AiPredictionRuns.FirstOrDefault(r => r.Id == id && !r.IsDeleted);
        if (run is not null)
            run.PredictedActions = MockDataStore.AiPredictedActions
                .Where(a => a.PredictionRunId == id && !a.IsDeleted)
                .ToList();
        return Task.FromResult(run);
    }

    public Task AddRunAsync(AiPredictionRun run)
    {
        run.Id = MockDataStore.NextAiRunId++;
        run.CreatedAt = DateTime.UtcNow;
        MockDataStore.AiPredictionRuns.Add(run);
        return Task.CompletedTask;
    }

    public Task AddPredictedActionsAsync(IEnumerable<AiPredictedAction> actions)
    {
        foreach (var a in actions)
        {
            a.Id = MockDataStore.NextAiActionId++;
            a.CreatedAt = DateTime.UtcNow;
            MockDataStore.AiPredictedActions.Add(a);
        }
        return Task.CompletedTask;
    }

    public void UpdateRun(AiPredictionRun run) => run.UpdatedAt = DateTime.UtcNow;
}
