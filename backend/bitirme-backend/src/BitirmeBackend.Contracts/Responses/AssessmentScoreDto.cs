namespace BitirmeBackend.Contracts.Responses;

public class AssessmentScoreDto
{
    public int Id { get; set; }
    public int AssessmentId { get; set; }
    public int CompetencyId { get; set; }
    public string CompetencyCode { get; set; } = string.Empty;
    public string CompetencyName { get; set; } = string.Empty;
    public string EvaluatorType { get; set; } = string.Empty;
    public double Score { get; set; }
}
