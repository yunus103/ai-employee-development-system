using BitirmeBackend.Application.Interfaces;
using BitirmeBackend.Application.Interfaces.Services;

namespace BitirmeBackend.Infrastructure.ExternalServices;

public class HealthService : IHealthService
{
    private readonly IMlPredictionClient _mlClient;

    public HealthService(IMlPredictionClient mlClient)
    {
        _mlClient = mlClient;
    }

    public async Task<object> GetHealthStatusAsync()
    {
        var mlHealthy = await _mlClient.IsHealthyAsync();

        return new
        {
            status   = "degraded",
            database = "mock",
            mlService = mlHealthy ? "ok" : "unavailable"
        };
    }
}
