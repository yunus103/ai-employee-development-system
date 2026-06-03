namespace BitirmeBackend.Application.Interfaces.Services;

public interface IHealthService
{
    /// <summary>
    /// Returns a health status object describing database and ML service availability.
    /// HTTP 200 + status="degraded" when ML is down; HTTP 503 when critical dependencies fail.
    /// </summary>
    Task<object> GetHealthStatusAsync();
}
