namespace BitirmeBackend.Application.Interfaces.Services;

public interface IPdfExportService
{
    /// <summary>
    /// Generates an action plan PDF on-the-fly and returns the raw bytes.
    /// PDF is NOT persisted to DB or file system — generated fresh on every request.
    /// </summary>
    Task<byte[]> GenerateActionPlanPdfAsync(int actionPlanId);
}
