using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IAiPredictionRepository
{
    Task<AiPredictionRun?> GetByIdAsync(int id);
    Task<AiPredictionRun?> GetByIdWithActionsAsync(int id);
    Task AddRunAsync(AiPredictionRun run);
    Task AddPredictedActionsAsync(IEnumerable<AiPredictedAction> actions);
    void UpdateRun(AiPredictionRun run);
}
