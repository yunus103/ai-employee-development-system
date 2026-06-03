using BitirmeBackend.Contracts.Dtos;

namespace BitirmeBackend.Application.Interfaces;

public interface IMlPredictionClient
{
    /// <summary>
    /// Calls POST /predict-actions/top-k?k={k} on the FastAPI ML service.
    /// Polly circuit breaker (NOT retry) must be applied at the HTTP client level.
    /// </summary>
    Task<MlPredictionResponse> PredictActionsTopKAsync(MlPredictionRequest request, int k = 13);

    /// <summary>
    /// Calls GET /health and returns true only when all components are loaded:
    /// model_loaded, encoder_loaded, feature_columns_loaded, label_names_loaded.
    /// </summary>
    Task<bool> IsHealthyAsync();
}
