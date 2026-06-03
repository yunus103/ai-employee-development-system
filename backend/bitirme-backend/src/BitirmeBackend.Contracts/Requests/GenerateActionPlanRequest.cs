namespace BitirmeBackend.Contracts.Requests;

public class GenerateActionPlanRequest
{
    public int AssessmentId { get; set; }
    public int TopK { get; set; } = 13;
}
