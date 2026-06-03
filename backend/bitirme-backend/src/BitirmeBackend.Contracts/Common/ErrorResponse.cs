namespace BitirmeBackend.Contracts.Common;

public class ErrorResponse
{
    public bool Success { get; set; } = false;
    public string Message { get; set; } = string.Empty;
    public IEnumerable<string>? Errors { get; set; }
    public string? CorrelationId { get; set; }
}
