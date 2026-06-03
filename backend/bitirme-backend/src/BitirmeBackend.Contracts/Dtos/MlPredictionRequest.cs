namespace BitirmeBackend.Contracts.Dtos;

public class MlPredictionRequest
{
    public int EmployeeId { get; set; }

    /// <summary>
    /// Feature dictionary keyed by FastAPI feature column names.
    /// Values may be numeric (int/double) or string (categorical).
    /// </summary>
    public Dictionary<string, object> Features { get; set; } = [];
}
