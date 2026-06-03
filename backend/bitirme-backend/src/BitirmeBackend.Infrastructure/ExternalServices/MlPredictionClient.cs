using System.Net;
using System.Text;
using System.Text.Json;
using BitirmeBackend.Application.Interfaces;
using BitirmeBackend.Contracts.Dtos;
using Microsoft.Extensions.Logging;

namespace BitirmeBackend.Infrastructure.ExternalServices;

/// <summary>
/// Real HTTP client for the FastAPI ML service.
/// Only registered in Production — FakeMlPredictionClient is used in Development.
/// Circuit breaker and timeout are configured via Polly resilience pipeline in Program.cs.
/// </summary>
public class MlPredictionClient : IMlPredictionClient
{
    private readonly HttpClient _http;
    private readonly ILogger<MlPredictionClient> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public MlPredictionClient(HttpClient http, ILogger<MlPredictionClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<MlPredictionResponse> PredictActionsTopKAsync(MlPredictionRequest request, int k = 13)
    {
        _logger.LogInformation("ML servisine tahmin isteği gönderiliyor. EmployeeId={EmployeeId}, k={K}", request.EmployeeId, k);

        var json = JsonSerializer.Serialize(request, _jsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        try
        {
            response = await _http.PostAsync($"/predict-actions/top-k?k={k}", content);
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "ML servisi isteği zaman aşımına uğradı.");
            throw;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "ML servisine bağlanılamadı.");
            throw;
        }

        if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
        {
            _logger.LogWarning("ML servisi 503 döndürdü — model yüklü değil veya servis hazır değil.");
            // Throw so Polly circuit breaker counts this as a failure
            response.EnsureSuccessStatusCode();
        }

        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<MlPredictionResponse>(responseJson, _jsonOptions)
            ?? throw new InvalidOperationException("ML servisi boş yanıt döndürdü.");

        _logger.LogInformation("ML tahmin yanıtı alındı. EmployeeId={EmployeeId}, RecommendedCount={Count}",
            result.EmployeeId, result.TotalRecommendedActions);

        return result;
    }

    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            var response = await _http.GetAsync("/health");
            if (!response.IsSuccessStatusCode) return false;

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            return root.TryGetProperty("model_loaded", out var modelLoaded)            && modelLoaded.GetBoolean()
                && root.TryGetProperty("encoder_loaded", out var encoderLoaded)        && encoderLoaded.GetBoolean()
                && root.TryGetProperty("feature_columns_loaded", out var featLoaded)   && featLoaded.GetBoolean()
                && root.TryGetProperty("label_names_loaded", out var labelLoaded)      && labelLoaded.GetBoolean();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ML servis sağlık kontrolü başarısız.");
            return false;
        }
    }
}
